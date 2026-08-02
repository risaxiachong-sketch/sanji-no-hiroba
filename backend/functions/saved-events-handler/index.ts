import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { DeleteCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { authenticate } from '../../shared/auth.js';
import { docClient, TABLE_SAVED_EVENTS } from '../../shared/dynamodb.js';
import { error, success } from '../../shared/response.js';
import { routeKey } from '../../shared/routing.js';

async function requireUser(event: APIGatewayProxyEventV2) {
  const user = await authenticate(event);
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
  try {
    const route = routeKey(event);
    const user = await requireUser(event);

    if (route === 'GET /saved-events') {
      const result = await docClient.send(new QueryCommand({
        TableName: TABLE_SAVED_EVENTS,
        KeyConditionExpression: 'pk = :pk',
        ExpressionAttributeValues: { ':pk': `USER#${user.userId}` },
      }));
      return success({ eventIds: (result.Items ?? []).map((item) => String(item.eventId)) });
    }

    const eventId = event.pathParameters?.eventId ?? event.pathParameters?.id;
    if (!eventId) return error(400, 'VALIDATION_ERROR', 'イベントIDが必要です。');

    if (route === 'POST /saved-events/{eventId}' || route === 'POST /saved-events/{id}') {
      await docClient.send(new PutCommand({
        TableName: TABLE_SAVED_EVENTS,
        Item: {
          pk: `USER#${user.userId}`,
          sk: `EVENT#${eventId}`,
          userId: user.userId,
          eventId,
          createdAt: new Date().toISOString(),
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      })).catch((cause: unknown) => {
        if ((cause as { name?: string }).name !== 'ConditionalCheckFailedException') throw cause;
      });
      return success({ eventId, saved: true }, 201);
    }

    if (route === 'DELETE /saved-events/{eventId}' || route === 'DELETE /saved-events/{id}') {
      await docClient.send(new DeleteCommand({
        TableName: TABLE_SAVED_EVENTS,
        Key: { pk: `USER#${user.userId}`, sk: `EVENT#${eventId}` },
      }));
      return success({ eventId, saved: false });
    }

    return error(404, 'NOT_FOUND', 'Not Found');
  } catch (cause) {
    if ((cause as Error).message === 'UNAUTHORIZED') {
      return error(401, 'UNAUTHORIZED', '認証が必要です。');
    }
    console.error('saved-events-handler', cause);
    return error(500, 'INTERNAL_ERROR', '保存イベントの処理中にエラーが発生しました。');
  }
};
