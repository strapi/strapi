import { afterEach, describe, expect, it, vi } from 'vitest';

import routes, { compatAuthRoutes } from '../content-api/auth';

describe('the catch-all routes', () => {
  it('mounts GET and POST on /auth/:path*, and nothing else', () => {
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'GET /auth/:path*',
      'POST /auth/:path*',
    ]);
  });

  it('answers with the engine, outside the plugin prefix, with no Strapi authentication', () => {
    for (const route of routes) {
      expect(route.handler).toBe('auth.handle');
      expect(route.config).toMatchObject({ auth: false, prefix: '' });
    }
  });

  it('goes through the endpoint allow-list first', () => {
    for (const route of routes) {
      expect(route.config?.middlewares).toEqual(['plugin::end-users.endpoint-allowlist']);
    }
  });
});

describe('the sessions route of the compatibility mode', () => {
  const withCompat = (usersPermissions: boolean) =>
    vi.stubGlobal('strapi', {
      config: {
        get: (path: string) => path.endsWith('compat.usersPermissions') && usersPermissions,
      },
    });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds DELETE /auth/sessions/:sessionId to the catch-all, with the same handler and config', () => {
    withCompat(true);

    const [route] = compatAuthRoutes() as Array<(typeof routes)[number]>;

    expect(compatAuthRoutes()).toHaveLength(1);
    expect(`${route.method} ${route.path}`).toBe('DELETE /auth/sessions/:sessionId');
    expect(route.handler).toBe('auth.handle');
    expect(route.config).toEqual(routes[0].config);
  });

  it('adds nothing with the compatibility mode off', () => {
    withCompat(false);

    expect(compatAuthRoutes()).toEqual([]);
  });
});
