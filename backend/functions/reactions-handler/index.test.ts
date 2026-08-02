import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  send: vi.fn(),
  authenticate: vi.fn(),
}));

vi.mock('../../shared/dynamodb.js', () => ({
  TABLE_REACTIONS: 'reactions',
  docClient: { send: mocks.send },
}));

vi.mock('../../shared/auth.js', () => ({
  authenticate: mocks.authenticate,
}));

import { handler } from './index.js';

function event(routeKey: string, postId: string, type: string) {
  return {
    routeKey,
    pathParameters: { postId, type },
  } as never;
}

describe('multiple reactions', () => {
  beforeEach(() => {
    mocks.send.mockReset().mockResolvedValue({});
    mocks.authenticate.mockReset().mockResolvedValue({
      userId: 'user-1',
      nickname: 'もこママ',
      avatarId: 'alpaca-1',
      childAgeGroup: '0-1',
    });
  });

  it('uses an independent key for each reaction type and removes only that type', async () => {
    await handler(event('POST /posts/{postId}/reactions/{type}', 'post-1', 'wakaru'));
    await handler(event('POST /posts/{postId}/reactions/{type}', 'post-1', 'ouen'));
    await handler(event('DELETE /posts/{postId}/reactions/{type}', 'post-1', 'wakaru'));

    const firstPut = mocks.send.mock.calls[0][0].input.Item;
    const secondPut = mocks.send.mock.calls[1][0].input.Item;
    const removedKey = mocks.send.mock.calls[2][0].input.Key;

    expect(firstPut.sk).toBe('REACTION#user-1#wakaru');
    expect(secondPut.sk).toBe('REACTION#user-1#ouen');
    expect(removedKey).toEqual({ pk: 'POST#post-1', sk: 'REACTION#user-1#wakaru' });
  });
});