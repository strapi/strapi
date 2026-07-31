import { createOAuthDiscoveryFallbackMiddleware } from '../oauthDiscoveryFallback';

const buildCtx = (method: string, path: string, status: number) => {
  const headers: Record<string, string> = {};
  return {
    method,
    path,
    status,
    body: undefined as unknown,
    set(key: string, value: string) {
      headers[key] = value;
    },
    _headers: headers,
  };
};

describe('createOAuthDiscoveryFallbackMiddleware', () => {
  const next = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    next.mockClear();
  });

  describe('OAuth probe paths — 404 downstream → JSON 404 response', () => {
    test('GET /.well-known/oauth-authorization-server', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('GET', '/.well-known/oauth-authorization-server', 404);

      await middleware(ctx as any, next);

      expect(ctx.status).toBe(404);
      expect(ctx._headers['Content-Type']).toBe('application/json');
      expect(ctx.body).toEqual({ error: 'not_found', error_description: 'OAuth is not supported' });
    });

    test('GET /.well-known/openid-configuration', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('GET', '/.well-known/openid-configuration', 404);

      await middleware(ctx as any, next);

      expect(ctx.status).toBe(404);
      expect(ctx._headers['Content-Type']).toBe('application/json');
      expect(ctx.body).toEqual({ error: 'not_found', error_description: 'OAuth is not supported' });
    });

    test('POST /register', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('POST', '/register', 404);

      await middleware(ctx as any, next);

      expect(ctx.status).toBe(404);
      expect(ctx._headers['Content-Type']).toBe('application/json');
      expect(ctx.body).toEqual({ error: 'not_found', error_description: 'OAuth is not supported' });
    });
  });

  describe('non-intercepted cases', () => {
    test('POST /register 200 — user route wins, response is untouched', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('POST', '/register', 200);
      ctx.body = { id: 'client-123' } as any;

      await middleware(ctx as any, next);

      expect(ctx.status).toBe(200);
      expect(ctx.body).toEqual({ id: 'client-123' });
    });

    test('GET /some-other-path 404 — non-OAuth 404 is not intercepted', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('GET', '/some-other-path', 404);

      await middleware(ctx as any, next);

      expect(ctx.body).toBeUndefined();
      expect(ctx._headers['Content-Type']).toBeUndefined();
    });

    test('PUT /.well-known/oauth-authorization-server 404 — wrong method, not a real probe', async () => {
      const middleware = createOAuthDiscoveryFallbackMiddleware();
      const ctx = buildCtx('PUT', '/.well-known/oauth-authorization-server', 404);

      await middleware(ctx as any, next);

      expect(ctx.body).toBeUndefined();
      expect(ctx._headers['Content-Type']).toBeUndefined();
    });
  });

  test('always calls next()', async () => {
    const middleware = createOAuthDiscoveryFallbackMiddleware();
    const ctx = buildCtx('GET', '/.well-known/oauth-authorization-server', 404);

    await middleware(ctx as any, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});
