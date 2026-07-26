import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { success, error } from '../../shared/response.js';
import { validatePost } from '../../shared/validation.js';
import { docClient, TABLE_POSTS, TABLE_REACTIONS } from '../../shared/dynamodb.js';
import { ulid } from 'ulid';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

/** リアクション種別一覧（集計用） */
const EMOJI_TYPES = [
  'wakaru',
  'otsukare',
  'kokoniiruyo',
  'watashimo',
  'ouen',
  'kyoumo',
  'yokattane',
  'hitoiki',
] as const;

/**
 * 投稿のリアクション集計を取得する
 */
async function getReactionCounts(postId: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const emoji of EMOJI_TYPES) {
    counts[emoji] = 0;
  }

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_REACTIONS,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': `POST#${postId}` },
    }),
  );

  if (result.Items) {
    for (const item of result.Items) {
      const emoji = item.emoji as string;
      if (emoji in counts) {
        counts[emoji]++;
      }
    }
  }

  return counts;
}

/**
 * 投稿一覧を取得する
 * GET /posts?limit=20&cursor=xxx
 */
async function getPosts(event: APIGatewayProxyEventV2) {
  try {
    const params = event.queryStringParameters ?? {};
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const cursor = params.cursor;

    const queryParams: {
      TableName: string;
      KeyConditionExpression: string;
      ExpressionAttributeValues: Record<string, string>;
      ScanIndexForward: boolean;
      Limit: number;
      ExclusiveStartKey?: Record<string, string>;
    } = {
      TableName: TABLE_POSTS,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: { ':pk': 'POSTS' },
      ScanIndexForward: false,
      Limit: limit,
    };

    if (cursor) {
      queryParams.ExclusiveStartKey = {
        pk: 'POSTS',
        sk: `POST#${cursor}`,
      };
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    const posts = await Promise.all(
      (result.Items ?? []).map(async (item) => {
        const reactions = await getReactionCounts(item.postId as string);
        return {
          id: item.postId,
          text: item.text,
          nickname: item.nickname,
          avatarId: item.avatarId,
          createdAt: item.createdAt,
          reactions,
        };
      }),
    );

    // nextCursor: LastEvaluatedKey がある場合はpostIdを返す
    let nextCursor: string | null = null;
    if (result.LastEvaluatedKey) {
      const lastSk = result.LastEvaluatedKey.sk as string;
      nextCursor = lastSk.replace('POST#', '');
    }

    return success({ posts, nextCursor });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'posts-handler',
        action: 'getPosts',
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      }),
    );
    return error(500, 'INTERNAL_ERROR', 'サーバーエラーが発生しました');
  }
}

/**
 * 投稿を登録する
 * POST /posts
 */
async function createPost(event: APIGatewayProxyEventV2) {
  try {
    const body = JSON.parse(event.body ?? '{}');

    const validation = validatePost(body);
    if (!validation.valid) {
      return error(400, 'VALIDATION_ERROR', validation.error);
    }

    const postId = ulid();
    const createdAt = new Date().toISOString();

    await docClient.send(
      new PutCommand({
        TableName: TABLE_POSTS,
        Item: {
          pk: 'POSTS',
          sk: `POST#${postId}`,
          postId,
          text: body.text,
          nickname: body.nickname,
          avatarId: body.avatarId,
          userId: body.userId,
          createdAt,
        },
      }),
    );

    return success(
      {
        id: postId,
        text: body.text,
        nickname: body.nickname,
        avatarId: body.avatarId,
        createdAt,
      },
      201,
    );
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'ERROR',
        function: 'posts-handler',
        action: 'createPost',
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
  const routeKey = event.routeKey;

  switch (routeKey) {
    case 'GET /posts':
      return getPosts(event);
    case 'POST /posts':
      return createPost(event);
    default:
      return error(404, 'NOT_FOUND', 'Not Found');
  }
};
