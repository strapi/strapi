import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { createRegisterHandler } from '../register';
import type { McpOAuthHandlerDependencies } from '../types';

describe('createRegisterHandler', () => {
  let register: Mock;
  let cleanupUnusedDynamicClients: Mock;
  let handler: ReturnType<typeof createRegisterHandler>;

  const registeredClient = {
    clientId: 'new-client-id',
    redirectUris: ['https://example.com/cb'],
    tokenEndpointAuthMethod: 'client_secret_basic',
    grantTypes: ['authorization_code', 'refresh_token'],
    responseTypes: ['code'],
    name: 'Claude',
    scope: null,
    clientUri: null,
    logoUri: null,
  };

  beforeEach(() => {
    register = vi.fn().mockResolvedValue({ client: registeredClient, clientSecret: 'the-secret' });
    cleanupUnusedDynamicClients = vi.fn().mockResolvedValue(undefined);
    handler = createRegisterHandler({
      clientStore: { register, cleanupUnusedDynamicClients },
    } as unknown as McpOAuthHandlerDependencies);
  });

  const makeCtx = (body: unknown) =>
    ({
      request: { body },
      status: 404,
      body: undefined as unknown,
      set: vi.fn(),
    }) as any;

  const validBody = {
    redirect_uris: ['https://example.com/cb'],
    client_name: 'Claude',
  };

  test('rejects a non-object body', async () => {
    const ctx = makeCtx(undefined);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_client_metadata' });
  });

  test.each([
    ['missing', undefined],
    ['empty', []],
    ['too many', Array.from({ length: 11 }, (_, i) => `https://example.com/cb${i}`)],
    ['dangerous scheme', ['javascript:alert(1)']], // eslint-disable-line no-script-url
    ['plain http on a non-loopback host', ['http://example.com/cb']],
    ['fragment', ['https://example.com/cb#frag']],
  ])('rejects redirect_uris: %s', async (_label, redirectUris) => {
    const ctx = makeCtx({ ...validBody, redirect_uris: redirectUris });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_redirect_uri' });
    expect(register).not.toHaveBeenCalled();
  });

  test.each([
    ['token_endpoint_auth_method', { token_endpoint_auth_method: 'private_key_jwt' }],
    ['grant_types', { grant_types: ['implicit'] }],
    ['empty grant_types', { grant_types: [] }],
    ['response_types', { response_types: ['token'] }],
    ['client_name', { client_name: 'x'.repeat(256) }], // the column is varchar(255)
    ['scope type', { scope: 42 }],
    ['client_uri scheme', { client_uri: 'ftp://example.com' }],
    ['logo_uri value', { logo_uri: 'not-a-url' }],
  ])('rejects invalid %s', async (_label, override) => {
    const ctx = makeCtx({ ...validBody, ...override });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_client_metadata' });
    expect(register).not.toHaveBeenCalled();
  });

  test('registers a confidential client by default and returns its secret once', async () => {
    const ctx = makeCtx({
      ...validBody,
      scope: 'mcp',
      client_uri: 'https://claude.ai',
    });

    await handler(ctx, vi.fn());

    expect(cleanupUnusedDynamicClients).toHaveBeenCalled();
    expect(register).toHaveBeenCalledWith({
      name: 'Claude',
      redirectUris: ['https://example.com/cb'],
      tokenEndpointAuthMethod: 'client_secret_basic',
      scope: 'mcp',
      clientUri: 'https://claude.ai',
      registrationSource: 'dynamic',
    });

    expect(ctx.status).toBe(201);
    expect(ctx.body).toMatchObject({
      client_id: 'new-client-id',
      client_secret: 'the-secret',
      client_secret_expires_at: 0,
      token_endpoint_auth_method: 'client_secret_basic',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      client_name: 'Claude',
    });
    expect(ctx.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  test('registers a public client without a secret', async () => {
    register.mockResolvedValue({
      client: { ...registeredClient, tokenEndpointAuthMethod: 'none' },
      clientSecret: null,
    });
    const ctx = makeCtx({ ...validBody, token_endpoint_auth_method: 'none' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(201);
    expect(ctx.body).not.toHaveProperty('client_secret');
    expect(ctx.body).not.toHaveProperty('client_secret_expires_at');
  });

  test('accepts loopback http redirect URIs (RFC 8252)', async () => {
    const ctx = makeCtx({ ...validBody, redirect_uris: ['http://127.0.0.1:33418/cb'] });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(201);
  });
});
