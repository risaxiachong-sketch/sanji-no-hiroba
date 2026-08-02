import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ulid } from 'ulid';
import { authenticate } from '../../shared/auth.js';
import { docClient, TABLE_POSTS, TABLE_REACTIONS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';

const REACTION_TYPES = [
  'wakaru', 'otsukare', 'kokoniiruyo', 'watashimo',
  'ouen', 'kyoumo', 'yokattane', 'hitoiki',
] as const;

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
async function reactionSummary(postId: string, currentUserId?: string) {
  const counts = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])) as Record<string, number>;
  const myReactions: string[] = [];
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_REACTIONS,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': `POST#${postId}` },
  }));

  for (const item of activeReactionItems(result.Items ?? [])) {
    const type = String(item.emoji ?? '');
    if (type in counts) counts[type] += 1;
    if (currentUserId && item.userId === currentUserId && type in counts) myReactions.push(type);
  }
  return { reactions: counts, myReactions };
}

async function getPosts(event: APIGatewayProxyEventV2) {
  const currentUser = await authenticate(event);
  const params = event.queryStringParameters ?? {};
  const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
  const cursor = params.cursor;
  const query = {
    TableName: TABLE_POSTS,
    KeyConditionExpression: 'pk = :pk',
    ExpressionAttributeValues: { ':pk': 'POSTS' },
    ScanIndexForward: false,
    Limit: limit,
    ...(cursor ? { ExclusiveStartKey: { pk: 'POSTS', sk: `POST#${cursor}` } } : {}),
  };
  const result = await docClient.send(new QueryCommand(query));
  const posts = await Promise.all((result.Items ?? []).map(async (item) => ({
    id: String(item.postId),
    text: String(item.text),
    nickname: String(item.nickname),
    avatarId: String(item.avatarId),
    userId: String(item.userId ?? ''),
    createdAt: String(item.createdAt),
    ...await reactionSummary(String(item.postId), currentUser?.userId),
  })));
  const nextCursor = result.LastEvaluatedKey
    ? String(result.LastEvaluatedKey.sk).replace('POST#', '')
    : null;
  return success({ posts, nextCursor });
}

async function createPost(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  if (!user) return error(401, 'UNAUTHORIZED', '認証が必要です。');
  const body = JSON.parse(event.body ?? '{}') as { text?: string };
  const text = body.text?.trim() ?? '';
  if (!text || text.length > 60) {
    return error(400, 'VALIDATION_ERROR', '投稿は1〜60文字で入力してください。');
  }

  const id = ulid();
  const createdAt = new Date().toISOString();
  await docClient.send(new PutCommand({
    TableName: TABLE_POSTS,
    Item: {
      pk: 'POSTS',
      sk: `POST#${id}`,
      postId: id,
      text,
      nickname: user.nickname,
      avatarId: user.avatarId,
      userId: user.userId,
      createdAt,
    },
  }));

  return success({
    id,
    text,
    nickname: user.nickname,
    avatarId: user.avatarId,
    userId: user.userId,
    createdAt,
    reactions: Object.fromEntries(REACTION_TYPES.map((type) => [type, 0])),
    myReactions: [],
  }, 201);
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    switch (routeKey(event)) {
      case 'GET /posts': return await getPosts(event);
      case 'POST /posts': return await createPost(event);
      default: return error(404, 'NOT_FOUND', 'Not Found');
    }
  } catch (cause) {
    console.error('posts-handler', cause);
    return error(500, 'INTERNAL_ERROR', '投稿処理中にエラーが発生しました。');
  }
};
