import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { createCodeStore } from '../code-store';

const makeSetup = () => {
  const query = {
    findOne: vi.fn(),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 9, ...data })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };

  const strapi = {
    config: {
      get: vi.fn((key: string) => (key === 'admin.apiToken.salt' ? 'api-token-salt' : undefined)),
    },
    db: { query: vi.fn(() => query) },
  } as unknown as Core.Strapi;

  return { store: createCodeStore(strapi), query };
};

const issueInput = {
  clientId: 'client-1',
  userId: '7',
  redirectUri: 'https://example.com/cb',
  codeChallenge: 'challenge',
  codeChallengeMethod: 'S256',
  grantId: 'grant-1',
};

describe('code store', () => {
  test('issue stores a hash, never the code itself, with the right expiry', async () => {
    const { store, query } = makeSetup();
    const before = Date.now();

    const code = await store.issue(issueInput, 120);

    expect(code).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
    const { data } = query.create.mock.calls[0][0];
    expect(data.codeHash).toMatch(/^[0-9a-f]{128}$/); // HMAC-SHA512 hex
    expect(data.codeHash).not.toBe(code);
    expect(data.consumedAt).toBeNull();
    const expiresAt = (data.expiresAt as Date).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 120_000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + 120_000);
  });

  describe('consume', () => {
    test('rejects non-string and oversized codes without querying', async () => {
      const { store, query } = makeSetup();

      await expect(store.consume(42)).resolves.toEqual({ status: 'not_found' });
      await expect(store.consume('x'.repeat(257))).resolves.toEqual({ status: 'not_found' });
      expect(query.findOne).not.toHaveBeenCalled();
    });

    test('reports not_found for an unknown code', async () => {
      const { store, query } = makeSetup();
      query.findOne.mockResolvedValue(null);

      await expect(store.consume('unknown')).resolves.toEqual({ status: 'not_found' });
    });

    test('consumes an unconsumed code exactly once', async () => {
      const { store, query } = makeSetup();
      const row = { id: 9, consumedAt: null };
      query.findOne.mockResolvedValue(row);

      await expect(store.consume('the-code')).resolves.toEqual({ status: 'consumed', row });
      expect(query.updateMany).toHaveBeenCalledWith({
        where: { id: 9, consumedAt: null },
        data: { consumedAt: expect.any(Date) },
      });
    });

    test('reports replayed for an already-consumed code', async () => {
      const { store, query } = makeSetup();
      const row = { id: 9, consumedAt: new Date() };
      query.findOne.mockResolvedValue(row);

      await expect(store.consume('the-code')).resolves.toEqual({ status: 'replayed', row });
      expect(query.updateMany).not.toHaveBeenCalled();
    });

    test('reports replayed when losing the race against a concurrent exchange', async () => {
      const { store, query } = makeSetup();
      const row = { id: 9, consumedAt: null };
      query.findOne.mockResolvedValue(row);
      query.updateMany.mockResolvedValue({ count: 0 });

      await expect(store.consume('the-code')).resolves.toEqual({ status: 'replayed', row });
    });
  });

  test('cleanupExpired deletes rows past their expiry', async () => {
    const { store, query } = makeSetup();

    await store.cleanupExpired();

    expect(query.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { $lt: expect.any(Date) } },
    });
  });
});
