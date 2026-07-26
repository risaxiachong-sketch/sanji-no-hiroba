import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { success, error } from '../../shared/response.js';
import { validateEvent, validateApiKey, VALID_STATUSES } from '../../shared/validation.js';
import { docClient, TABLE_EVENTS } from '../../shared/dynamodb.js';
import { ulid } from 'ulid';
import { QueryCommand, PutCommand, GetCommand, UpdateCommand, BatchGetCommand } from '@aws-sdk/lib-dynamodb';

const s3 = new S3Client({ region: 'ap-northeast-1' });
const S3_BUCKET = process.env.S3_BUCKET ?? 'sanji-demo-images';

/**
 * imageUrl（S3キー）から署名付き取得URLを生成する（有効期限1時間）
 */
async function generateSignedGetUrl(imageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: imageKey,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * GET /events - イベント一覧取得
 * クエリパラメータ ids が指定された場合: BatchGetItem で複数イベント取得
 * ids がない場合: DynamoDB Query（PK="EVENTS", SK begins_with "EVENT#"）で全件取得
 */
async function getEvents(event: APIGatewayProxyEventV2) {
  try {
    const idsParam = event.queryStringParameters?.ids;

    let items: Record<string, unknown>[] = [];

    if (idsParam) {
      // ids指定時: BatchGetItem で複数イベント取得
      const ids = idsParam.split(',').filter((id) => id.trim().length > 0);

      if (ids.length === 0) {
        return success({ events: [] });
      }

      const keys = ids.map((id) => ({
        pk: 'EVENTS',
        sk: `EVENT#${id.trim()}`,
      }));

      const result = await docClient.send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE_EVENTS]: {
              Keys: keys,
            },
          },
        }),
      );

      items = (result.Responses?.[TABLE_EVENTS] ?? []) as Record<string, unknown>[];
    } else {
      // ids未指定: Query で全件取得
      const result = await docClient.send(
        new QueryCommand({
          TableName: TABLE_EVENTS,
          KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
          ExpressionAttributeValues: {
            ':pk': 'EVENTS',
            ':skPrefix': 'EVENT#',
          },
        }),
      );

      items = (result.Items ?? []) as Record<string, unknown>[];
    }

    // 各イベントの imageUrl がある場合は署名付きURLを生成
    const events = await Promise.all(
      items.map(async (item) => {
        let imageUrl: string | null = null;
        if (item.imageUrl && typeof item.imageUrl === 'string') {
          imageUrl = await generateSignedGetUrl(item.imageUrl);
        }

        return {
          eventId: item.eventId,
          providerName: item.providerName,
          eventName: item.eventName,
          eventDate: item.eventDate,
          startTime: item.startTime,
          endTime: item.endTime,
          ageGroup: item.ageGroup,
          location: item.location,
          description: item.description,
          tags: item.tags,
          officialUrl: item.officialUrl ?? null,
          status: item.status,
          imageUrl,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    );

    return success({ events });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'events-handler',
        action: 'getEvents',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }),
    );
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
}

/**
 * GET /events/{id} - 単一イベント取得
 */
async function getEvent(event: APIGatewayProxyEventV2) {
  try {
    const eventId = event.pathParameters?.id;

    if (!eventId) {
      return error(400, 'VALIDATION_ERROR', 'イベントIDは必須です');
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_EVENTS,
        Key: {
          pk: 'EVENTS',
          sk: `EVENT#${eventId}`,
        },
      }),
    );

    if (!result.Item) {
      return error(404, 'NOT_FOUND', 'イベントが見つかりません');
    }

    const item = result.Item;

    let imageUrl: string | null = null;
    if (item.imageUrl && typeof item.imageUrl === 'string') {
      imageUrl = await generateSignedGetUrl(item.imageUrl);
    }

    return success({
      eventId: item.eventId,
      providerName: item.providerName,
      eventName: item.eventName,
      eventDate: item.eventDate,
      startTime: item.startTime,
      endTime: item.endTime,
      ageGroup: item.ageGroup,
      location: item.location,
      description: item.description,
      tags: item.tags,
      officialUrl: item.officialUrl ?? null,
      status: item.status,
      imageUrl,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'events-handler',
        action: 'getEvent',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }),
    );
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
}

/**
 * POST /admin/events - イベント登録
 */
async function createEvent(event: APIGatewayProxyEventV2) {
  try {
    // APIキー検証
    const apiKeyResult = validateApiKey(
      (event.headers as Record<string, string | undefined>) ?? {},
    );
    if (!apiKeyResult.valid) {
      return error(403, 'FORBIDDEN', apiKeyResult.error);
    }

    const body = JSON.parse(event.body ?? '{}');

    // バリデーション
    const validation = validateEvent(body);
    if (!validation.valid) {
      return error(400, 'VALIDATION_ERROR', validation.error);
    }

    const eventId = ulid();
    const now = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TABLE_EVENTS,
        Item: {
          pk: 'EVENTS',
          sk: `EVENT#${eventId}`,
          eventId,
          providerName: body.providerName,
          eventName: body.eventName,
          eventDate: body.eventDate,
          startTime: body.startTime,
          endTime: body.endTime,
          ageGroup: body.ageGroup,
          location: body.location,
          description: body.description ?? '',
          tags: body.tags ?? [],
          officialUrl: body.officialUrl ?? null,
          status: '開催予定',
          imageUrl: body.imageUrl ?? null,
          createdAt: now,
          updatedAt: now,
        },
      }),
    );

    return success(
      {
        eventId,
        status: '開催予定',
        createdAt: now,
      },
      201,
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'events-handler',
        action: 'createEvent',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }),
    );
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
}

/**
 * PATCH /admin/events/{id}/status - イベント開催状態変更
 */
async function updateEventStatus(event: APIGatewayProxyEventV2) {
  try {
    // APIキー検証
    const apiKeyResult = validateApiKey(
      (event.headers as Record<string, string | undefined>) ?? {},
    );
    if (!apiKeyResult.valid) {
      return error(403, 'FORBIDDEN', apiKeyResult.error);
    }

    const eventId = event.pathParameters?.id;
    if (!eventId) {
      return error(400, 'VALIDATION_ERROR', 'イベントIDは必須です');
    }

    const body = JSON.parse(event.body ?? '{}');
    const { status } = body;

    // ステータスバリデーション
    if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
      return error(400, 'VALIDATION_ERROR', '無効な開催状態です');
    }

    const updatedAt = new Date().toISOString();

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_EVENTS,
        Key: {
          pk: 'EVENTS',
          sk: `EVENT#${eventId}`,
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': updatedAt,
        },
      }),
    );

    return success({
      eventId,
      status,
      updatedAt,
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'events-handler',
        action: 'updateEventStatus',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }),
    );
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
}

/**
 * Lambda ハンドラー
 * routeKey に基づいてルーティングを行う
 */
export const handler = async (event: APIGatewayProxyEventV2) => {
  const routeKey = event.routeKey ?? `${event.requestContext.http.method} ${event.requestContext.http.path}`;

  switch (true) {
    case routeKey === 'GET /events':
      return getEvents(event);
    case routeKey.startsWith('GET /events/'):
      return getEvent(event);
    case routeKey === 'POST /admin/events':
      return createEvent(event);
    case routeKey.startsWith('PATCH /admin/events/') && routeKey.endsWith('/status'):
      return updateEventStatus(event);
    default:
      return error(404, 'NOT_FOUND', 'Not Found');
  }
};
