import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../../configuration';
import { verifyConsentTicket } from '../../services/consent-ticket';
import { createAuthorizeHandler } from '../authorize';
import type { McpOAuthHandlerDependencies } from '../types';

const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

const makeStrapi = (): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'server.absoluteUrl': 'http://localhost:1337',
          'admin.absoluteUrl': 'http://localhost:1337/admin',
          'admin.auth.secret': 'admin-secret',
        };
        return key in values ? values[key] : defaultValue;
      }),
    },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi;

describe('createAuthorizeHandler', () => {
  let findByClientId: Mock;
  let config: McpOAuthConfiguration;
  let handler: ReturnType<typeof createAuthorizeHandler>;

  const client = {
    clientId: 'client-1',
    redirectUris: ['https://example.com/cb'],
  };

  beforeEach(() => {
    findByClientId = vi.fn().mockResolvedValue(client);
    config = new McpOAuthConfiguration(makeStrapi(), '/mcp');
    handler = createAuthorizeHandler({
      strapi: makeStrapi(),
      config,
      clientStore: { findByClientId },
      codeStore: {},
      grantSessions: {},
    } as unknown as McpOAuthHandlerDependencies);
  });

  const makeCtx = (query: Record<string, unknown>) => {
    const ctx = {
      query,
      status: 404,
      body: undefined as unknown,
      headers: {} as Record<string, string>,
      set: vi.fn(),
      redirect: vi.fn(),
    };
    return ctx as any;
  };

  const validQuery = {
    client_id: 'client-1',
    redirect_uri: 'https://example.com/cb',
    response_type: 'code',
    code_challenge: CHALLENGE,
    code_challenge_method: 'S256',
    state: 'xyz',
  };

  test('responds 400 without redirecting when the client is unknown', async () => {
    findByClientId.mockResolvedValue(null);
    const ctx = makeCtx(validQuery);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_client' });
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  test('responds 400 without redirecting when the redirect_uri is not registered', async () => {
    const ctx = makeCtx({ ...validQuery, redirect_uri: 'https://evil.example/cb' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_request' });
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  // Registration is open, so every validation failure answers 400 in place: an automatic
  // error redirect would make the endpoint an open redirector to any registered URI.
  test('responds 400 without redirecting when response_type is not code', async () => {
    const ctx = makeCtx({ ...validQuery, response_type: 'token' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'unsupported_response_type' });
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  test.each([
    ['missing code_challenge', { ...validQuery, code_challenge: undefined }],
    ['plain method', { ...validQuery, code_challenge_method: 'plain' }],
    ['missing method', { ...validQuery, code_challenge_method: undefined }],
  ])('responds 400 with invalid_request on %s (PKCE is mandatory)', async (_label, query) => {
    const ctx = makeCtx(query);

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_request' });
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  test('responds 400 with invalid_target for an unknown resource', async () => {
    const ctx = makeCtx({ ...validQuery, resource: 'https://other.example/mcp' });

    await handler(ctx, vi.fn());

    expect(ctx.status).toBe(400);
    expect(ctx.body).toMatchObject({ error: 'invalid_target' });
    expect(ctx.redirect).not.toHaveBeenCalled();
  });

  test('redirects to the admin consent page with a verifiable ticket', async () => {
    const ctx = makeCtx({ ...validQuery, scope: 'mcp', resource: 'http://localhost:1337/mcp/' });

    await handler(ctx, vi.fn());

    const target = new URL(ctx.redirect.mock.calls[0][0]);
    expect(`${target.origin}${target.pathname}`).toBe(
      'http://localhost:1337/admin/mcp/oauth/consent'
    );

    const ticket = target.searchParams.get('ticket');
    expect(verifyConsentTicket(ticket, config.getJwtSecret())).toEqual({
      clientId: 'client-1',
      redirectUri: 'https://example.com/cb',
      codeChallenge: CHALLENGE,
      codeChallengeMethod: 'S256',
      scope: 'mcp',
      state: 'xyz',
      resource: 'http://localhost:1337/mcp',
    });
  });
});
