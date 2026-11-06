import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { createClientStore, UNUSED_DYNAMIC_CLIENT_LIFESPAN_MS } from '../client-store';
import type { McpOAuthClient } from '../client-store';

const makeSetup = ({ salt = 'api-token-salt' }: { salt?: string } = {}) => {
  const query = {
    findOne: vi.fn(),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data })),
    update: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };

  const strapi = {
    config: {
      get: vi.fn((key: string) => (key === 'admin.apiToken.salt' ? salt : undefined)),
    },
    db: { query: vi.fn(() => query) },
  } as unknown as Core.Strapi;

  return { store: createClientStore(strapi), query };
};

describe('client store', () => {
  describe('findByClientId', () => {
    test('returns null for an empty id without querying', async () => {
      const { store, query } = makeSetup();

      await expect(store.findByClientId('')).resolves.toBeNull();
      expect(query.findOne).not.toHaveBeenCalled();
    });

    test('looks the client up by clientId', async () => {
      const { store, query } = makeSetup();
      query.findOne.mockResolvedValue({ clientId: 'client-1' });

      await expect(store.findByClientId('client-1')).resolves.toEqual({ clientId: 'client-1' });
      expect(query.findOne).toHaveBeenCalledWith({ where: { clientId: 'client-1' } });
    });
  });

  describe('register', () => {
    test('creates a confidential client with a hashed secret', async () => {
      const { store, query } = makeSetup();

      const { client, clientSecret } = await store.register({
        name: 'Claude',
        redirectUris: ['https://example.com/cb'],
        tokenEndpointAuthMethod: 'client_secret_basic',
        registrationSource: 'dynamic',
      });

      expect(clientSecret).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 random bytes, base64url
      const { data } = query.create.mock.calls[0][0];
      expect(data.clientSecretHash).toMatch(/^[0-9a-f]{128}$/); // HMAC-SHA512 hex
      expect(data.clientSecretHash).not.toContain(clientSecret);
      expect(data.grantTypes).toEqual(['authorization_code', 'refresh_token']);
      expect(data.responseTypes).toEqual(['code']);
      expect(data.lastGrantedAt).toBeNull();
      expect(client.clientId).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes, base64url
    });

    test('creates a public client without a secret', async () => {
      const { store, query } = makeSetup();

      const { clientSecret } = await store.register({
        redirectUris: ['https://example.com/cb'],
        tokenEndpointAuthMethod: 'none',
        registrationSource: 'dynamic',
      });

      expect(clientSecret).toBeNull();
      expect(query.create.mock.calls[0][0].data.clientSecretHash).toBeNull();
    });

    test('refuses to hash without the admin.apiToken.salt', async () => {
      const { store } = makeSetup({ salt: '' });

      await expect(
        store.register({
          redirectUris: ['https://example.com/cb'],
          tokenEndpointAuthMethod: 'client_secret_basic',
          registrationSource: 'dynamic',
        })
      ).rejects.toThrow('admin.apiToken.salt');
    });
  });

  describe('verifySecret', () => {
    test('accepts the right secret and rejects everything else', async () => {
      const { store } = makeSetup();

      const { client, clientSecret } = await store.register({
        redirectUris: ['https://example.com/cb'],
        tokenEndpointAuthMethod: 'client_secret_post',
        registrationSource: 'dynamic',
      });

      expect(store.verifySecret(client as McpOAuthClient, clientSecret)).toBe(true);
      expect(store.verifySecret(client as McpOAuthClient, 'wrong-secret')).toBe(false);
      expect(store.verifySecret(client as McpOAuthClient, '')).toBe(false);
      expect(store.verifySecret(client as McpOAuthClient, 42)).toBe(false);
    });

    test('rejects any secret for a public client (null hash)', () => {
      const { store } = makeSetup();
      const client = { clientSecretHash: null } as McpOAuthClient;

      expect(store.verifySecret(client, 'anything')).toBe(false);
    });
  });

  test('markGranted stamps lastGrantedAt on the client', async () => {
    const { store, query } = makeSetup();

    await store.markGranted('client-1');

    expect(query.update).toHaveBeenCalledWith({
      where: { clientId: 'client-1' },
      data: { lastGrantedAt: expect.any(Date) },
    });
  });

  test('cleanupUnusedDynamicClients deletes dynamic clients never granted within the window', async () => {
    const { store, query } = makeSetup();
    const before = Date.now();

    await store.cleanupUnusedDynamicClients();

    const { where } = query.deleteMany.mock.calls[0][0];
    expect(where.registrationSource).toBe('dynamic');
    expect(where.lastGrantedAt).toEqual({ $null: true });
    const cutoff = (where.createdAt.$lt as Date).getTime();
    expect(cutoff).toBeGreaterThanOrEqual(before - UNUSED_DYNAMIC_CLIENT_LIFESPAN_MS - 1000);
    expect(cutoff).toBeLessThanOrEqual(Date.now() - UNUSED_DYNAMIC_CLIENT_LIFESPAN_MS);
  });
});
