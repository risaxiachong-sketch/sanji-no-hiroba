import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { authenticate } from '../../shared/auth.js';
import { docClient, TABLE_REACTIONS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';
import { VALID_EMOJIS } from '../../shared/validation.js';

function validType(value: string | undefined): value is (typeof VALID_EMOJIS)[number] {
  return Boolean(value && (VALID_EMOJIS as readonly string[]).includes(value));
}

function activeReactionItems(items: Record<string, unknown>[]) {
  const newKeys = new Set(
    items
      .map((item) => String(item.sk ?? ''))
      .filter((key) => key.split('#').length >= 3),
  );
  return items.filter((item) => {
    const key = String(item.sk ?? '');
    if (key.split('#').length >= 3) return true;
    if (item.legacyMigratedAt) return false;
    return !newKeys.has(`REACTION#${item.userId}#${item.emoji}`);
  });
}
async function list(event: APIGatewayProxyEventV2) {
  const postId = event.pathParameters?.postId ?? event.queryStringParameters?.postId;
  const type = event.pathParameters?.type
    ?? event.queryStringParameters?.type
    ?? event.queryStringParameters?.emoji;
  if (!postId) return error(400, 'VALIDATION_ERROR', '投稿IDが必要です。');
  if (type && !validType(type)) return error(400, 'VALIDATION_ERROR', 'リアクションの種類が正しくありません。');

  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_REACTIONS,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `POST#${postId}` },
    ...(type ? {
      FilterExpression: 'emoji = :emoji',
      ExpressionAttributeValues: { ':pk': `POST#${postId}`, ':emoji': type },
    } : {}),
  }));
  return success({
    reactions: activeReactionItems(result.Items ?? []).map((item) => ({
      id: String(item.reactionId ?? item.sk),
      userId: String(item.userId),
      nickname: String(item.nickname ?? ''),
      avatarId: String(item.avatarId ?? ''),
      emoji: String(item.emoji),
      createdAt: String(item.createdAt ?? ''),
    })),
  });
}

async function add(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  if (!user) return error(401, 'UNAUTHORIZED', '認証が必要です。');
  const body = JSON.parse(event.body ?? '{}') as { postId?: string; emoji?: string };
  const postId = event.pathParameters?.postId ?? body.postId;
  const type = event.pathParameters?.type ?? body.emoji;
  if (!postId || !validType(type)) return error(400, 'VALIDATION_ERROR', '投稿IDが必要です。認証が必要です。');

  const createdAt = new Date().toISOString();
  const reactionId = `${user.userId}#${type}`;
  await docClient.send(new PutCommand({
    TableName: TABLE_REACTIONS,
    Item: {
      pk: `POST#${postId}`,
      sk: `REACTION#${user.userId}#${type}`,
      reactionId,
      postId,
      userId: user.userId,
      emoji: type,
      nickname: user.nickname,
      avatarId: user.avatarId,
      createdAt,
    },
  }));
  return success({ id: reactionId, postId, emoji: type, userId: user.userId, createdAt }, 201);
}

async function remove(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  if (!user) return error(401, 'UNAUTHORIZED', '認証が必要です。');
  const body = event.body ? JSON.parse(event.body) as { postId?: string; emoji?: string } : {};
  const postId = event.pathParameters?.postId ?? body.postId ?? event.queryStringParameters?.postId;
  const type = event.pathParameters?.type ?? body.emoji ?? event.queryStringParameters?.emoji;
  if (!postId || !validType(type)) return error(400, 'VALIDATION_ERROR', '投稿IDが必要です。認証が必要です。');

  await docClient.send(new DeleteCommand({
    TableName: TABLE_REACTIONS,
    Key: { pk: `POST#${postId}`, sk: `REACTION#${user.userId}#${type}` },
  }));
  return success({ postId, emoji: type, removed: true });
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const route = routeKey(event);
    if (route === 'GET /reactions' || route === 'GET /posts/{postId}/reactions') return await list(event);
    if (route === 'POST /reactions' || route === 'POST /posts/{postId}/reactions/{type}') return await add(event);
    if (route.startsWith('DELETE /reactions') || route === 'DELETE /posts/{postId}/reactions/{type}') return await remove(event);
    return error(404, 'NOT_FOUND', 'Not Found');
  } catch (cause) {
    console.error('reactions-handler', cause);
    return error(500, 'INTERNAL_ERROR', 'リアクション処理中にエラーが発生しました。');
  }
};
