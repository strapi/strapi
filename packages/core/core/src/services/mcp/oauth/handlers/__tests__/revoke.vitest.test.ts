import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import { createRevokeHandler } from '../revoke';
import type { McpOAuthHandlerDependencies } from '../types';

describe('createRevokeHandler', () => {
  let findByClientId: Mock;
  let verifySecret: Mock;
  let revokeToken: Mock;
  let handler: ReturnType<typeof createRevokeHandler>;

  const publicClient = { clientId: 'client-1', tokenEndpointAuthMethod: 'none' };

  beforeEach(() => {
    findByClientId = vi.fn().mockResolvedValue(publicClient);
    verifySecret = vi.fn().mockReturnValue(false);
    revokeToken = vi.fn().mockResolvedValue(true);
    handler = createRevokeHandler({
      clientStore: { findByClientId, verifySecret },
      grantSessions: { revokeToken },
    } as unknown as McpOAuthHandlerDependencies);
  });

  const makeCtx = (body: Record<string, unknown>, header: Record<string, string> = {}) =>
    ({
      request: { body, header },
      status: 404,
      body: undefined as unknown,
      set: vi.fn(),
    }) as any;

  test('answers 400 when no client_id is provided', async () => {
    const ctx = makeCtx({ token: 'some-token' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_request' });
  });

  test('answers 401 with a WWW-Authenticate challenge for an unknown client', async () => {
    findByClientId.mockResolvedValue(null);
    const ctx = makeCtx({ client_id: 'nope', token: 'some-token' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(401);
    expect(ctx.body).toMatchObject({ error: 'invalid_client' });
    expect(ctx.set).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="mcp"');
  });

  test('answers 400 when the token parameter is missing', async () => {
    const ctx = makeCtx({ client_id: 'client-1' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_request' });
    expect(revokeToken).not.toHaveBeenCalled();
  });

  test('revokes the token for the authenticated client', async () => {
    const ctx = makeCtx({ client_id: 'client-1', token: 'the-token' });

    await handler(ctx, vi.fn());

    expect(revokeToken).toHaveBeenCalledWith('the-token', 'client-1');
    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({});
  });

  test('still answers 200 for a token that resolves to nothing (RFC 7009)', async () => {
    revokeToken.mockResolvedValue(false);
    const ctx = makeCtx({ client_id: 'client-1', token: 'unknown-token' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(200);
    expect(ctx.body).toEqual({});
  });
});
