import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { BatchGetCommand, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ulid } from 'ulid';
import { docClient, TABLE_EVENTS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';
import { validateApiKey } from '../../shared/validation.js';

const s3 = new S3Client({ region: process.env.AWS_REGION ?? 'ap-northeast-1' });
const bucket = process.env.S3_BUCKET ?? 'sanji-demo-images';
const statuses = new Set(['scheduled', 'canceled', 'postponed', 'closed', 'ended']);

function normalizeStatus(value: unknown) {
  const status = String(value ?? 'scheduled');
  const legacy: Record<string, string> = {
    '開催予定': 'scheduled',
    '中止': 'canceled',
    '延期': 'postponed',
    '受付終了': 'closed',
    '開催終了': 'ended',
  };
  return legacy[status] ?? (statuses.has(status) ? status : 'scheduled');
}

async function getImageUrl(value: unknown) {
  if (typeof value !== 'string' || !value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) return value;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: value }), { expiresIn: 3600 });
}

function parseAgeRange(value: string) {
  const values = value.match(/[0-9]+/g)?.map(Number) ?? [];
  return { ageMin: values[0] ?? 0, ageMax: values[1] ?? values[0] ?? 6 };
}

async function serialize(item: Record<string, unknown>) {
  const range = parseAgeRange(String(item.ageRange ?? item.ageGroup ?? '0〜6歳'));
  const startTime = String(item.startTime ?? '');
  const endTime = String(item.endTime ?? '');
  return {
    id: String(item.id ?? item.eventId),
    title: String(item.title ?? item.eventName ?? ''),
    date: String(item.date ?? item.eventDate ?? ''),
    time: String(item.time ?? (startTime && endTime ? `${startTime}〜${endTime}` : '')),
    ageMin: Number(item.ageMin ?? range.ageMin),
    ageMax: Number(item.ageMax ?? range.ageMax),
    ageRange: String(item.ageRange ?? item.ageGroup ?? ''),
    location: String(item.location ?? ''),
    address: String(item.address ?? ''),
    facilityType: String(item.facilityType ?? 'other'),
    price: String(item.price ?? 'free'),
    priceLabel: String(item.priceLabel ?? '無料'),
    indoor: Boolean(item.indoor ?? true),
    reservationRequired: Boolean(item.reservationRequired ?? false),
    nursingRoom: Boolean(item.nursingRoom ?? false),
    diaperChange: Boolean(item.diaperChange ?? false),
    strollerOk: Boolean(item.strollerOk ?? true),
    source: String(item.source ?? item.providerName ?? ''),
    officialUrl: String(item.officialUrl ?? '#'),
    lastConfirmed: String(item.lastConfirmed ?? item.updatedAt ?? item.createdAt ?? '').slice(0, 10),
    description: String(item.description ?? ''),
    status: normalizeStatus(item.status),
    imageUrl: await getImageUrl(item.imageUrl ?? item.imageKey),
  };
}

async function batchGetEvents(ids: string[]) {
  const items: Record<string, unknown>[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    let keys = ids.slice(offset, offset + 100).map((id) => ({ pk: 'EVENTS', sk: `EVENT#${id}` }));
    for (let attempt = 0; keys.length && attempt < 5; attempt += 1) {
      const result = await docClient.send(new BatchGetCommand({
        RequestItems: { [TABLE_EVENTS]: { Keys: keys } },
      }));
      items.push(...(result.Responses?.[TABLE_EVENTS] ?? []));
      keys = (result.UnprocessedKeys?.[TABLE_EVENTS]?.Keys ?? []) as typeof keys;
    }
  }
  return items;
}

async function listEvents(event: APIGatewayProxyEventV2) {
  const ids = event.queryStringParameters?.ids?.split(',').map((id) => id.trim()).filter(Boolean);
  const items: Record<string, unknown>[] = [];

  if (ids?.length) {
    items.push(...await batchGetEvents(ids));
  } else {
    let cursor: Record<string, unknown> | undefined;
    do {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_EVENTS,
        KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
        ExpressionAttributeValues: { ':pk': 'EVENTS', ':prefix': 'EVENT#' },
        ExclusiveStartKey: cursor,
      }));
      items.push(...(result.Items ?? []));
      cursor = result.LastEvaluatedKey;
    } while (cursor);
  }

  const events = await Promise.all(items.map(serialize));
  events.sort((left, right) => `${left.date} ${left.time}`.localeCompare(`${right.date} ${right.time}`));
  return success({ events });
}

async function getEvent(event: APIGatewayProxyEventV2) {
  const id = event.pathParameters?.eventId ?? event.pathParameters?.id;
  if (!id) return error(400, 'VALIDATION_ERROR', 'イベントIDが必要です。');

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_EVENTS,
    Key: { pk: 'EVENTS', sk: `EVENT#${id}` },
  }));
  return result.Item
    ? success(await serialize(result.Item))
    : error(404, 'NOT_FOUND', 'イベントが見つかりません。');
}

async function createEvent(event: APIGatewayProxyEventV2) {
  const apiKey = validateApiKey(event.headers ?? {});
  if (!apiKey.valid) return error(403, 'FORBIDDEN', apiKey.error);

  const body = JSON.parse(event.body ?? '{}') as Record<string, unknown>;
  for (const key of ['title', 'date', 'time', 'location', 'source']) {
    if (typeof body[key] !== 'string' || !body[key].trim()) {
      return error(400, 'VALIDATION_ERROR', `${key}は必須です。`);
    }
  }

  const id = typeof body.id === 'string' && body.id ? body.id : ulid();
  const now = new Date().toISOString();
  const item = {
    ...body,
    pk: 'EVENTS',
    sk: `EVENT#${id}`,
    id,
    eventId: id,
    status: normalizeStatus(body.status),
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_EVENTS,
      Item: item,
      ConditionExpression: 'attribute_not_exists(pk)',
    }));
  } catch (cause) {
    if ((cause as { name?: string }).name === 'ConditionalCheckFailedException') {
      return error(409, 'CONFLICT', '同じIDのイベントがすでにあります。');
    }
    throw cause;
  }
  return success(await serialize(item), 201);
}

async function updateStatus(event: APIGatewayProxyEventV2) {
  const apiKey = validateApiKey(event.headers ?? {});
  if (!apiKey.valid) return error(403, 'FORBIDDEN', apiKey.error);

  const id = event.pathParameters?.eventId ?? event.pathParameters?.id;
  const body = JSON.parse(event.body ?? '{}') as { status?: string };
  if (!id || !body.status || !statuses.has(body.status)) {
    return error(400, 'VALIDATION_ERROR', 'イベントIDと正しい開催状態が必要です。');
  }

  const updatedAt = new Date().toISOString();
  await docClient.send(new UpdateCommand({
    TableName: TABLE_EVENTS,
    Key: { pk: 'EVENTS', sk: `EVENT#${id}` },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': body.status, ':updatedAt': updatedAt },
    ConditionExpression: 'attribute_exists(pk)',
  }));
  return success({ id, status: body.status, updatedAt });
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const route = routeKey(event);
    if (route === 'GET /events') return await listEvents(event);
    if (route === 'GET /events/{eventId}' || route === 'GET /events/{id}') return await getEvent(event);
    if (route === 'POST /admin/events') return await createEvent(event);
    if (route === 'PATCH /admin/events/{eventId}/status' || route === 'PATCH /admin/events/{id}/status') {
      return await updateStatus(event);
    }
    return error(404, 'NOT_FOUND', 'Not Found');
  } catch (cause) {
    console.error('events-handler', cause);
    return error(500, 'INTERNAL_ERROR', 'イベント処理中にエラーが発生しました。');
  }
};