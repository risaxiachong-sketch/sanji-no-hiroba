import { createHash, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_USERS } from './dynamodb.js';
import { header } from './routing.js';

export interface AuthenticatedUser {
  userId: string;
  nickname: string;
  childAgeGroup: string;
  avatarId: string;
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function sameHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function authenticate(event: APIGatewayProxyEventV2): Promise<AuthenticatedUser | null> {
  const authorization = header(event, 'authorization');
  const userId = header(event, 'x-user-id');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!userId || !token) return null;

  const result = await docClient.send(new GetCommand({
    TableName: TABLE_USERS,
    Key: { pk: `USER#${userId}`, sk: 'PROFILE' },
  }));
  const item = result.Item;
  if (!item?.tokenHash || !sameHash(hashToken(token), String(item.tokenHash))) return null;

  return {
    userId,
    nickname: String(item.nickname ?? ''),
    childAgeGroup: String(item.childAgeGroup ?? ''),
    avatarId: String(item.avatarId ?? ''),
  };
}
