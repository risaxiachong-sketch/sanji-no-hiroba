import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  items: new Map<string, Record<string, unknown>>(),
  send: vi.fn(),
}));

vi.mock('../../shared/dynamodb.js', () => ({
  TABLE_USERS: 'users',
  docClient: { send: database.send },
}));

import { handler } from './index.js';

function key(item: Record<string, unknown>) {
  return `${item.pk}|${item.sk}`;
}

function registration(installationId: string, deviceToken: string) {
  return {
    routeKey: 'POST /users/register',
    body: JSON.stringify({
      installationId,
      deviceToken,
      nickname: 'もこママ',
      childAgeGroup: '0-1',
      avatarId: 'alpaca-1',
    }),
  } as never;
}

describe('users registration', () => {
  beforeEach(() => {
    database.items.clear();
    database.send.mockReset();
    database.send.mockImplementation(async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
      if (command.constructor.name === 'GetCommand') {
        return { Item: database.items.get(key(command.input.Key as Record<string, unknown>)) };
      }
      if (command.constructor.name === 'TransactWriteCommand') {
        const transactions = command.input.TransactItems as Array<{ Put: { Item: Record<string, unknown> } }>;
        transactions.forEach(({ Put }) => database.items.set(key(Put.Item), Put.Item));
        return {};
      }
      throw new Error(`Unexpected command: ${command.constructor.name}`);
    });
  });

  it('is idempotent per installation but allows duplicate nicknames', async () => {
    const tokenA = 'a'.repeat(64);
    const first = await handler(registration('install-a', tokenA));
    const retry = await handler(registration('install-a', tokenA));
    const secondUser = await handler(registration('install-b', 'b'.repeat(64)));

    const firstBody = JSON.parse(first.body);
    const retryBody = JSON.parse(retry.body);
    const secondBody = JSON.parse(secondUser.body);

    expect(retryBody.userId).toBe(firstBody.userId);
    expect(secondBody.userId).not.toBe(firstBody.userId);
    expect(secondBody.nickname).toBe(firstBody.nickname);
    expect(firstBody).not.toHaveProperty('tokenHash');
    expect(firstBody).toEqual({
      userId: expect.any(String),
      nickname: 'もこママ',
      childAgeGroup: '0-1',
      avatarId: 'alpaca-1',
    });
  });
});