import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { BatchGetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { encodeTime } from 'ulid';
import { docClient, TABLE_POSTS, TABLE_USERS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';

interface RecentAuthor {
  userId: string;
  nickname: string;
  avatarId: string;
  latestPost: string;
  lastPostedAt: string;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  if (routeKey(event) !== 'GET /plaza/recent-users') {
    return error(404, 'NOT_FOUND', 'Not Found');
  }

  try {
    const requestedDays = Number(event.queryStringParameters?.days ?? 7);
    const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 7, 1), 30);
    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const lowerBound = encodeTime(since, 10) + '0000000000000000';
    let exclusiveStartKey: Record<string, unknown> | undefined;
    const users = new Map<string, RecentAuthor>();

    do {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_POSTS,
        KeyConditionExpression: 'pk = :pk AND sk >= :lower',
        ExpressionAttributeValues: { ':pk': 'POSTS', ':lower': `POST#${lowerBound}` },
        ScanIndexForward: false,
        ExclusiveStartKey: exclusiveStartKey,
      }));
      for (const item of result.Items ?? []) {
        const userId = String(item.userId ?? '');
        if (!userId || users.has(userId)) continue;
        users.set(userId, {
          userId,
          nickname: String(item.nickname ?? ''),
          avatarId: String(item.avatarId ?? ''),
          latestPost: String(item.text ?? ''),
          lastPostedAt: String(item.createdAt ?? ''),
        });
      }
      exclusiveStartKey = result.LastEvaluatedKey;
    } while (exclusiveStartKey);

    const userIds = [...users.keys()];
    for (let offset = 0; offset < userIds.length; offset += 100) {
      const batch = userIds.slice(offset, offset + 100);
      const result = await docClient.send(new BatchGetCommand({
        RequestItems: {
          [TABLE_USERS]: {
            Keys: batch.map((userId) => ({ pk: `USER#${userId}`, sk: 'PROFILE' })),
          },
        },
      }));
      for (const profile of result.Responses?.[TABLE_USERS] ?? []) {
        const existing = users.get(String(profile.userId));
        if (existing) {
          existing.nickname = String(profile.nickname ?? existing.nickname);
          existing.avatarId = String(profile.avatarId ?? existing.avatarId);
        }
      }
    }

    return success({ users: [...users.values()] });
  } catch (cause) {
    console.error('plaza-handler', cause);
    return error(500, 'INTERNAL_ERROR', '広場の利用者を取得できませんでした。');
  }
};
