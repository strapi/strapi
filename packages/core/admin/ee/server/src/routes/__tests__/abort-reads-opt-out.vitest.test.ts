import { describe, expect, test } from 'vitest';

import sso from '../sso';

type Route = { method: string; path: string; config?: Record<string, unknown> };

describe('admin SSO routes and the request abort signal', () => {
  const routes = sso.routes as Route[];

  test('GET /connect/:provider (login redirect and provider callback, which writes) opts out', () => {
    const route = routes.find((r) => r.method === 'GET' && r.path === '/connect/:provider');

    expect(route?.config?.abortReadsOnRequestDisconnect).toBe(false);
  });

  test('read only GET routes do not opt out', () => {
    routes
      .filter((r) => r.method === 'GET' && r.path !== '/connect/:provider')
      .forEach((route) => {
        expect(route.config?.abortReadsOnRequestDisconnect).toBeUndefined();
      });
  });
});
