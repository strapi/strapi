import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../../configuration';
import { computeS256Challenge } from '../../utils/pkce';
import { createTokenHandler } from '../token';
import type { McpOAuthHandlerDependencies } from '../types';

const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = computeS256Challenge(VERIFIER);

const makeStrapi = (): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'server.absoluteUrl': 'http://localhost:1337',
        };
        return key in values ? values[key] : defaultValue;
      }),
    },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi;

describe('createTokenHandler', () => {
  let findByClientId: Mock;
  let verifySecret: Mock;
  let consume: Mock;
  let cleanupExpired: Mock;
  let issueGrant: Mock;
  let refreshGrant: Mock;
  let revokeFamily: Mock;
  let handler: ReturnType<typeof createTokenHandler>;

  const publicClient = {
    clientId: 'client-1',
    clientSecretHash: null,
    tokenEndpointAuthMethod: 'none',
    redirectUris: ['https://example.com/cb'],
  };

  const codeRow = {
    id: 1,
    clientId: 'client-1',
    userId: '42',
    redirectUri: 'https://example.com/cb',
    codeChallenge: CHALLENGE,
    codeChallengeMethod: 'S256',
    scope: null,
    resource: null,
    grantId: 'grant-1',
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  };

  beforeEach(() => {
    findByClientId = vi.fn().mockResolvedValue(publicClient);
    verifySecret = vi.fn().mockReturnValue(false);
    consume = vi.fn().mockResolvedValue({ status: 'consumed', row: codeRow });
    cleanupExpired = vi.fn().mockResolvedValue(undefined);
    issueGrant = vi.fn().mockResolvedValue({ accessToken: 'at', refreshToken: 'rt' });
    refreshGrant = vi.fn().mockResolvedValue({ accessToken: 'at2', refreshToken: 'rt2' });
    revokeFamily = vi.fn().mockResolvedValue(undefined);

    handler = createTokenHandler({
      strapi: makeStrapi(),
      config: new McpOAuthConfiguration(makeStrapi(), '/mcp'),
      clientStore: { findByClientId, verifySecret },
      codeStore: { consume, cleanupExpired },
      grantSessions: { issueGrant, refreshGrant, revokeFamily },
    } as unknown as McpOAuthHandlerDependencies);
  });

  const makeCtx = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
    ({
      request: { body, header: headers },
      status: 404,
      body: undefined as unknown,
      set: vi.fn(),
    }) as any;

  const validCodeBody = {
    grant_type: 'authorization_code',
    client_id: 'client-1',
    code: 'the-code',
    redirect_uri: 'https://example.com/cb',
    code_verifier: VERIFIER,
  };

  test('exchanges a valid code for tokens', async () => {
    const ctx = makeCtx(validCodeBody);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({
      access_token: 'at',
      token_type: 'Bearer',
      expires_in: 30 * 60,
      refresh_token: 'rt',
    });
    expect(issueGrant).toHaveBeenCalledWith({
      userId: '42',
      grantId: 'grant-1',
      clientId: 'client-1',
    });
    expect(cleanupExpired).toHaveBeenCalled();
  });

  test('responds invalid_client with a 401 for an unknown client', async () => {
    findByClientId.mockResolvedValue(null);
    const ctx = makeCtx(validCodeBody);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(401);
    expect(ctx.body).toMatchObject({ error: 'invalid_client' });
  });

  test('requires the secret for confidential clients', async () => {
    findByClientId.mockResolvedValue({
      ...publicClient,
      clientSecretHash: 'hash',
      tokenEndpointAuthMethod: 'client_secret_post',
    });
    const ctx = makeCtx({ ...validCodeBody, client_secret: 'wrong' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(401);
    expect(ctx.body).toMatchObject({ error: 'invalid_client' });
  });

  test('revokes the grant family when a consumed code is replayed', async () => {
    consume.mockResolvedValue({ status: 'replayed', row: codeRow });
    const ctx = makeCtx(validCodeBody);

    await handler(ctx, vi.fn());

    expect(revokeFamily).toHaveBeenCalledWith('42', 'grant-1');
    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
  });

  test('rejects a code issued to another client', async () => {
    consume.mockResolvedValue({ status: 'consumed', row: { ...codeRow, clientId: 'other' } });
    const ctx = makeCtx(validCodeBody);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
    expect(issueGrant).not.toHaveBeenCalled();
  });

  test('rejects an expired code', async () => {
    consume.mockResolvedValue({
      status: 'consumed',
      row: { ...codeRow, expiresAt: new Date(Date.now() - 1000) },
    });
    const ctx = makeCtx(validCodeBody);

    await handler(ctx, vi.fn());

    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
  });

  test('rejects a redirect_uri mismatch', async () => {
    const ctx = makeCtx({ ...validCodeBody, redirect_uri: 'https://example.com/other' });

    await handler(ctx, vi.fn());

    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
    expect(issueGrant).not.toHaveBeenCalled();
  });

  test('rejects a wrong PKCE verifier', async () => {
    const ctx = makeCtx({ ...validCodeBody, code_verifier: 'a'.repeat(43) });

    await handler(ctx, vi.fn());

    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
    expect(issueGrant).not.toHaveBeenCalled();
  });

  test('refreshes a grant and returns the rotated tokens', async () => {
    const ctx = makeCtx({
      grant_type: 'refresh_token',
      client_id: 'client-1',
      refresh_token: 'rt',
    });

    await handler(ctx, vi.fn());

    expect(refreshGrant).toHaveBeenCalledWith('rt', 'client-1');
    expect(ctx.status).toBe(200);
    expect(ctx.body).toMatchObject({ access_token: 'at2', refresh_token: 'rt2' });
  });

  test('answers invalid_grant when the refresh is rejected', async () => {
    refreshGrant.mockResolvedValue({ error: 'invalid_grant' });
    const ctx = makeCtx({
      grant_type: 'refresh_token',
      client_id: 'client-1',
      refresh_token: 'stale',
    });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_grant' });
  });

  test('rejects unsupported grant types', async () => {
    const ctx = makeCtx({ grant_type: 'password', client_id: 'client-1' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'unsupported_grant_type' });
  });

  test('authenticates confidential clients through the Basic header', async () => {
    const client = {
      ...publicClient,
      clientSecretHash: 'hash',
      tokenEndpointAuthMethod: 'client_secret_basic',
    };
    findByClientId.mockResolvedValue(client);
    verifySecret.mockReturnValue(true);

    const credentials = Buffer.from('client-1:the-secret').toString('base64');
    const ctx = makeCtx(
      { grant_type: 'refresh_token', refresh_token: 'rt' },
      { authorization: `Basic ${credentials}` }
    );

    await handler(ctx, vi.fn());

    expect(findByClientId).toHaveBeenCalledWith('client-1');
    expect(verifySecret).toHaveBeenCalledWith(client, 'the-secret');
    expect(ctx.status).toBe(200);
  });
});
