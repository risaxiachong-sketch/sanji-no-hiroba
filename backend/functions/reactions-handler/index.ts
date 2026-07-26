import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { success, error } from '../../shared/response.js';
import { validateReaction } from '../../shared/validation.js';
import { docClient, TABLE_REACTIONS } from '../../shared/dynamodb.js';
import { ulid } from 'ulid';
import { QueryCommand, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

export const handler = async (event: APIGatewayProxyEventV2) => {
  const routeKey = event.routeKey ?? `${event.requestContext.http.method} ${event.requestContext.http.path}`;

  try {
    switch (true) {
      case routeKey === 'POST /reactions':
        return await createReaction(event);
      case routeKey.startsWith('PUT /reactions'):
        return await updateReaction(event);
      case routeKey.startsWith('DELETE /reactions'):
        return await deleteReaction(event);
      case routeKey === 'GET /reactions':
        return await getReactions(event);
      default:
        return error(404, 'NOT_FOUND', 'Not Found');
    }
  } catch (err) {
    console.error(JSON.stringify({
      level: 'ERROR',
      function: 'reactions-handler',
      error: err instanceof Error ? err.message : String(err),
      requestId: event.requestContext.requestId,
      timestamp: new Date().toISOString(),
    }));
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
};

/**
 * POST /reactions - リアクション登録
 * PK="POST#{postId}", SK="REACTION#{userId}" で上書き（同一ユーザーは変更扱い）
 */
async function createReaction(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? '{}');
  const validation = validateReaction(body);
  if (!validation.valid) {
    return error(400, 'VALIDATION_ERROR', validation.error);
  }

  const { postId, emoji, userId, nickname, avatarId } = body;
  const reactionId = ulid();
  const createdAt = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_REACTIONS,
      Item: {
        pk: `POST#${postId}`,
        sk: `REACTION#${userId}`,
        reactionId,
        postId,
        userId,
        emoji,
        nickname: nickname ?? '',
        avatarId: avatarId ?? '',
        createdAt,
      },
    }),
  );

  return success(
    {
      id: reactionId,
      postId,
      emoji,
      userId,
      createdAt,
    },
    201,
  );
}

/**
 * PUT /reactions/{id} - リアクション変更
 * bodyからpostId, userId, emojiを取得し、同じPK+SKに上書き
 */
async function updateReaction(event: APIGatewayProxyEventV2) {
  const body = JSON.parse(event.body ?? '{}');
  const { postId, userId, emoji, nickname, avatarId } = body;

  if (!postId || !userId || !emoji) {
    return error(400, 'VALIDATION_ERROR', 'postId, userId, emoji は必須です');
  }

  const validation = validateReaction({ postId, emoji, userId });
  if (!validation.valid) {
    return error(400, 'VALIDATION_ERROR', validation.error);
  }

  const reactionId = ulid();
  const createdAt = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_REACTIONS,
      Item: {
        pk: `POST#${postId}`,
        sk: `REACTION#${userId}`,
        reactionId,
        postId,
        userId,
        emoji,
        nickname: nickname ?? '',
        avatarId: avatarId ?? '',
        createdAt,
      },
    }),
  );

  return success({
    id: reactionId,
    postId,
    emoji,
    userId,
    createdAt,
  });
}

/**
 * DELETE /reactions/{id} - リアクション取消
 * bodyまたはクエリパラメータからpostId, userIdを取得して削除
 */
async function deleteReaction(event: APIGatewayProxyEventV2) {
  let postId: string | undefined;
  let userId: string | undefined;

  // bodyから取得を試みる
  if (event.body) {
    const body = JSON.parse(event.body);
    postId = body.postId;
    userId = body.userId;
  }

  // クエリパラメータからも取得を試みる（bodyが空の場合のフォールバック）
  if (!postId || !userId) {
    postId = postId ?? event.queryStringParameters?.postId;
    userId = userId ?? event.queryStringParameters?.userId;
  }

  if (!postId || !userId) {
    return error(400, 'VALIDATION_ERROR', 'postId と userId は必須です');
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_REACTIONS,
      Key: {
        pk: `POST#${postId}`,
        sk: `REACTION#${userId}`,
      },
    }),
  );

  return success({ message: 'リアクションを削除しました' });
}

/**
 * GET /reactions - リアクション取得
 * クエリパラメータ: postId (必須), emoji (任意)
 */
async function getReactions(event: APIGatewayProxyEventV2) {
  const postId = event.queryStringParameters?.postId;
  const emoji = event.queryStringParameters?.emoji;

  if (!postId) {
    return error(400, 'VALIDATION_ERROR', 'postId クエリパラメータは必須です');
  }

  const params: {
    TableName: string;
    KeyConditionExpression: string;
    ExpressionAttributeValues: Record<string, string>;
    FilterExpression?: string;
  } = {
    TableName: TABLE_REACTIONS,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': `POST#${postId}`,
      ':skPrefix': 'REACTION#',
    },
  };

  if (emoji) {
    params.FilterExpression = 'emoji = :emoji';
    params.ExpressionAttributeValues[':emoji'] = emoji;
  }

  const result = await docClient.send(new QueryCommand(params));

  const reactions = (result.Items ?? []).map((item) => ({
    id: item.reactionId,
    userId: item.userId,
    nickname: item.nickname,
    avatarId: item.avatarId,
    emoji: item.emoji,
    createdAt: item.createdAt,
  }));

  return success({ reactions });
}
