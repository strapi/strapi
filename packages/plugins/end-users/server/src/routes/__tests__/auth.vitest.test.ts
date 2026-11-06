import { describe, expect, it } from 'vitest';

import routes from '../content-api/auth';

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
