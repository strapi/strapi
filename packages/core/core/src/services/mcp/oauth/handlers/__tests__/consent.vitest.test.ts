import { describe, test, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../../configuration';
import { signConsentTicket } from '../../services/consent-ticket';
import { createGetAuthorizationRequestHandler, createSubmitConsentHandler } from '../consent';
import type { McpOAuthHandlerDependencies } from '../types';

const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

const makeStrapi = (): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'server.absoluteUrl': 'http://localhost:1337',
          'admin.auth.secret': 'admin-secret',
        };
        return key in values ? values[key] : defaultValue;
      }),
    },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi;

describe('consent handlers', () => {
  let config: McpOAuthConfiguration;
  let findByClientId: Mock;
  let issue: Mock;
  let deps: McpOAuthHandlerDependencies;

  const client = {
    clientId: 'client-1',
    name: 'Claude',
    clientUri: null,
    logoUri: null,
    redirectUris: ['https://example.com/cb'],
  };

  beforeEach(() => {
    config = new McpOAuthConfiguration(makeStrapi(), '/mcp');
    findByClientId = vi.fn().mockResolvedValue(client);
    issue = vi.fn().mockResolvedValue('the-code');
    deps = {
      strapi: makeStrapi(),
      config,
      clientStore: { findByClientId },
      codeStore: { issue },
      grantSessions: {},
    } as unknown as McpOAuthHandlerDependencies;
  });

  const makeTicket = (overrides: Record<string, unknown> = {}) =>
    signConsentTicket(
      {
        clientId: 'client-1',
        redirectUri: 'https://example.com/cb',
        codeChallenge: CHALLENGE,
        codeChallengeMethod: 'S256',
        state: 'xyz',
        ...overrides,
      },
      config.getJwtSecret(),
      300
    );

  const makeCtx = ({
    query = {},
    body = {},
    session = { id: 'session-1' } as unknown,
  }: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    session?: unknown;
  }) =>
    ({
      query,
      request: { body },
      state: { user: { id: 7 }, session },
      body: undefined as unknown,
      badRequest: vi.fn(),
      forbidden: vi.fn(),
    }) as any;

  describe('createGetAuthorizationRequestHandler', () => {
    test('describes a valid pending request', async () => {
      const handler = createGetAuthorizationRequestHandler(deps);
      const ctx = makeCtx({ query: { ticket: makeTicket({ scope: 'mcp' }) } });

      await handler(ctx, vi.fn());

      expect(ctx.body).toEqual({
        data: {
          client: { name: 'Claude' },
          redirectUri: 'https://example.com/cb',
          redirectHost: 'example.com',
          scope: 'mcp',
        },
      });
    });

    test('answers 400 for a bad ticket', async () => {
      const handler = createGetAuthorizationRequestHandler(deps);
      const ctx = makeCtx({ query: { ticket: 'garbage' } });

      await handler(ctx, vi.fn());

      expect(ctx.badRequest).toHaveBeenCalledWith(expect.any(String), { code: 'invalid_ticket' });
    });

    test('answers 400 when the client no longer exists', async () => {
      findByClientId.mockResolvedValue(null);
      const handler = createGetAuthorizationRequestHandler(deps);
      const ctx = makeCtx({ query: { ticket: makeTicket() } });

      await handler(ctx, vi.fn());

      expect(ctx.badRequest).toHaveBeenCalled();
    });
  });

  describe('createSubmitConsentHandler', () => {
    test('rejects callers without an admin session (API tokens)', async () => {
      const handler = createSubmitConsentHandler(deps);
      const ctx = makeCtx({
        body: { ticket: makeTicket(), decision: 'approve' },
        session: null,
      });

      await handler(ctx, vi.fn());

      expect(ctx.forbidden).toHaveBeenCalled();
      expect(issue).not.toHaveBeenCalled();
    });

    test('rejects an invalid decision', async () => {
      const handler = createSubmitConsentHandler(deps);
      const ctx = makeCtx({ body: { ticket: makeTicket(), decision: 'maybe' } });

      await handler(ctx, vi.fn());

      expect(ctx.badRequest).toHaveBeenCalled();
    });

    test('issues a code bound to the approving user and redirects with state and iss', async () => {
      const handler = createSubmitConsentHandler(deps);
      const ctx = makeCtx({
        body: { ticket: makeTicket({ scope: 'mcp' }), decision: 'approve' },
      });

      await handler(ctx, vi.fn());

      expect(issue).toHaveBeenCalledWith(
        {
          clientId: 'client-1',
          userId: '7',
          redirectUri: 'https://example.com/cb',
          codeChallenge: CHALLENGE,
          codeChallengeMethod: 'S256',
          scope: 'mcp',
          grantId: expect.any(String),
        },
        120
      );

      const redirectTo = new URL((ctx.body as any).data.redirectTo);
      expect(`${redirectTo.origin}${redirectTo.pathname}`).toBe('https://example.com/cb');
      expect(redirectTo.searchParams.get('code')).toBe('the-code');
      expect(redirectTo.searchParams.get('state')).toBe('xyz');
      expect(redirectTo.searchParams.get('iss')).toBe('http://localhost:1337');
    });

    test('redirects with access_denied on deny without issuing a code', async () => {
      const handler = createSubmitConsentHandler(deps);
      const ctx = makeCtx({ body: { ticket: makeTicket(), decision: 'deny' } });

      await handler(ctx, vi.fn());

      expect(issue).not.toHaveBeenCalled();

      const redirectTo = new URL((ctx.body as any).data.redirectTo);
      expect(redirectTo.searchParams.get('error')).toBe('access_denied');
      expect(redirectTo.searchParams.get('state')).toBe('xyz');
    });
  });
});
