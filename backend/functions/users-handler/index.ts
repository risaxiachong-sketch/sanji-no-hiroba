import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { authenticate, hashToken } from '../../shared/auth.js';
import { docClient, TABLE_USERS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';

function publicProfile(item: Record<string, unknown> | undefined) {
  if (!item) return null;
  return {
    userId: String(item.userId ?? ''),
    nickname: String(item.nickname ?? ''),
    childAgeGroup: String(item.childAgeGroup ?? ''),
    avatarId: String(item.avatarId ?? ''),
  };
}
function validProfile(body: Record<string, unknown>) {
  return typeof body.nickname === 'string' && body.nickname.trim().length > 0 && body.nickname.length <= 20
    && typeof body.childAgeGroup === 'string' && body.childAgeGroup.length > 0
    && typeof body.avatarId === 'string' && body.avatarId.length > 0;
}

async function register(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? '{}') as Record<string, unknown>;
  const installationId = typeof body.installationId === 'string' ? body.installationId : '';
  const deviceToken = typeof body.deviceToken === 'string' ? body.deviceToken : '';
  if (!installationId || deviceToken.length < 32 || !validProfile(body)) {
    return error(400, 'VALIDATION_ERROR', '登録内容が正しくありません。');
  }

  const identityKey = { pk: `INSTALLATION#${installationId}`, sk: 'IDENTITY' };
  const existing = await docClient.send(new GetCommand({ TableName: TABLE_USERS, Key: identityKey }));
  if (existing.Item) {
    if (String(existing.Item.tokenHash) !== hashToken(deviceToken)) {
      return error(403, 'FORBIDDEN', '登録内容が正しくありません。');
    }
    const profile = await docClient.send(new GetCommand({
      TableName: TABLE_USERS,
      Key: { pk: `USER#${existing.Item.userId}`, sk: 'PROFILE' },
    }));
    return success(publicProfile(profile.Item));
  }

  const userId = ulid();
  const now = new Date().toISOString();
  const tokenHash = hashToken(deviceToken);
  const profile = {
    pk: `USER#${userId}`,
    sk: 'PROFILE',
    userId,
    nickname: String(body.nickname).trim(),
    childAgeGroup: String(body.childAgeGroup),
    avatarId: String(body.avatarId),
    tokenHash,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_USERS, Item: profile, ConditionExpression: 'attribute_not_exists(pk)' } },
        {
          Put: {
            TableName: TABLE_USERS,
            Item: { ...identityKey, installationId, userId, tokenHash, createdAt: now },
            ConditionExpression: 'attribute_not_exists(pk)',
          },
        },
      ],
    }));
  } catch {
    const retry = await docClient.send(new GetCommand({ TableName: TABLE_USERS, Key: identityKey }));
    if (!retry.Item || String(retry.Item.tokenHash) !== tokenHash) throw new Error('Registration conflict');
    const retryProfile = await docClient.send(new GetCommand({
      TableName: TABLE_USERS,
      Key: { pk: `USER#${retry.Item.userId}`, sk: 'PROFILE' },
    }));
    return success(publicProfile(retryProfile.Item));
  }

  return success(publicProfile(profile), 201);
}

async function getMe(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  return user ? success(user) : error(401, 'UNAUTHORIZED', '認証が必要です。');
}

async function updateMe(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  if (!user) return error(401, 'UNAUTHORIZED', '認証が必要です。');
  const body = JSON.parse(event.body ?? '{}') as Record<string, unknown>;
  const updates: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  for (const key of ['nickname', 'childAgeGroup', 'avatarId'] as const) {
    if (typeof body[key] === 'string' && body[key].trim()) {
      names[`#${key}`] = key;
      values[`:${key}`] = body[key].trim();
      updates.push(`#${key} = :${key}`);
    }
  }
  if (updates.length === 0) return error(400, 'VALIDATION_ERROR', '認証が必要です。?');
  updates.push('updatedAt = :updatedAt');

  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_USERS,
    Key: { pk: `USER#${user.userId}`, sk: 'PROFILE' },
    UpdateExpression: `SET ${updates.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return success(publicProfile(result.Attributes));
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    switch (routeKey(event)) {
      case 'POST /users/register': return await register(event);
      case 'GET /users/me': return await getMe(event);
      case 'PATCH /users/me': return await updateMe(event);
      default: return error(404, 'NOT_FOUND', 'Not Found');
    }
  } catch (cause) {
    console.error('users-handler', cause);
    return error(500, 'INTERNAL_ERROR', 'プロフィール処理中にエラーが発生しました。');
  }
};
