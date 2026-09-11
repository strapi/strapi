/* eslint-env jest */

import routes from '../authentication';

type RouteEntry = {
  method: string;
  path: string;
  handler: string;
  config: {
    auth?: boolean;
    middlewares?: Array<string | { name: string; config?: unknown }>;
  };
};

const route = (method: string, path: string): RouteEntry | undefined =>
  (routes as unknown as RouteEntry[]).find((r) => r.method === method && r.path === path);

const hasRateLimitEntry = (
  middlewares: Array<string | { name: string; config?: unknown }> = []
): boolean =>
  middlewares.some(
    (m) =>
      (typeof m === 'string' && m === 'admin::rateLimit') ||
      (typeof m === 'object' && m !== null && m.name === 'admin::rateLimit')
  );

describe('authentication routes', () => {
  // Every route whose rate-limit bucket structurally collapses onto the source IP, because its
  // body carries a token rather than an email: `admin::rateLimit` keys on
  // `${email}:${path}:${ip}` (see `middlewares/rateLimit.ts`) and substitutes a literal
  // `unknownEmail` when the body has none. Behind NAT or an unproxied reverse proxy that bucket
  // is "everyone on this network", so at the middleware default a whole org shares five attempts
  // per five minutes. The token must never become the key (it is secret material), so each of
  // these routes widens the ceiling at the route level instead. Leaving one at the default is
  // the regression this pins.
  describe.each([
    ['/reset-password', 20],
    ['/login/mfa', 50],
    ['/login/mfa/webauthn/options', 50],
    ['/login/mfa/webauthn', 50],
  ])('POST %s raises its rate-limit ceiling', (path, expected) => {
    test(`is overridden to at least ${expected}`, () => {
      const entry = route('POST', path);
      expect(entry).toBeDefined();

      const rateLimit = (entry!.config.middlewares ?? []).find(
        (m): m is { name: string; config?: { max?: number } } =>
          typeof m === 'object' && m !== null && m.name === 'admin::rateLimit'
      );

      // A bare `'admin::rateLimit'` string entry (no override) fails here.
      expect(rateLimit).toBeDefined();
      expect(rateLimit!.config?.max).toBeGreaterThanOrEqual(expected);
    });
  });

  test('every other admin::rateLimit route entry is left at the shared default', () => {
    // Pins today's behaviour for the other routes so this test only ever asserts the deliberate
    // widenings above, not an accidental blanket change to every rate-limited route.
    //
    // The `find` predicate below used to match only entries that were *already* the bare
    // string `'admin::rateLimit'`, then assert they equal `'admin::rateLimit'` -- a tautology
    // that skipped any route whose entry was an object override entirely (`if (entry !==
    // undefined)` never ran for those). It now also matches the object form (`{ name:
    // 'admin::rateLimit', config: {...} }`), so a route that gained an undocumented override
    // fails here instead of silently passing.
    const widened = [
      '/reset-password',
      '/login/mfa',
      '/login/mfa/webauthn/options',
      '/login/mfa/webauthn',
    ];
    const otherRateLimited = routes.filter(
      (r) => !widened.includes(r.path) && r.method === 'POST'
    ) as unknown as Array<{
      path: string;
      config: { middlewares?: Array<string | { name: string; config?: unknown }> };
    }>;

    for (const route of otherRateLimited) {
      const entry = (route.config.middlewares ?? []).find(
        (m) =>
          (typeof m === 'string' && m === 'admin::rateLimit') ||
          (typeof m === 'object' && m !== null && m.name === 'admin::rateLimit')
      );
      if (entry !== undefined) {
        expect(entry).toBe('admin::rateLimit');
      }
    }
  });

  // Nothing pinned the two new `/login/mfa/webauthn` routes' existence, their `auth: false`,
  // or their rate limit -- deleting `middlewares: ['admin::rateLimit']` from `POST
  // /login/mfa/webauthn` left the whole `@strapi/admin` server suite green (1240/1240). This
  // enumerates the entire unauthenticated POST login surface -- the plain password login and all
  // three ways to complete an MFA challenge -- so a route disappearing, gaining `auth: true`, or
  // losing its throttle fails here first. Shaped like `routes/__tests__/mfa.test.ts`'s
  // `route(method, path)` + `test.each` pattern.
  describe('the unauthenticated POST login surface is pinned', () => {
    test.each([
      ['/login', 'authentication.login'],
      ['/login/mfa', 'authentication.loginMfa'],
      ['/login/mfa/webauthn/options', 'authentication.loginMfaWebauthnOptions'],
      ['/login/mfa/webauthn', 'authentication.loginMfaWebauthn'],
    ])('POST %s exists, is unauthenticated, and rate-limited', (path, handler) => {
      const entry = route('POST', path);

      expect(entry).toBeDefined();
      expect(entry!.handler).toBe(handler);
      expect(entry!.config.auth).toBe(false);
      expect(hasRateLimitEntry(entry!.config.middlewares)).toBe(true);
    });
  });
});
