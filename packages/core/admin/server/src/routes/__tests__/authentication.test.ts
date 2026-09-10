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
  // F2: `/reset-password` carries a reset token, not an email, so `admin::rateLimit`'s
  // `${email}:${path}:${ip}` key (see `middlewares/rateLimit.ts`) collapses every reset in the
  // deployment onto one shared `unknownEmail:/admin/reset-password:<ip>` bucket. Behind NAT or an
  // unproxied reverse proxy that bucket is effectively "everyone on this network" -- at the
  // middleware's own default (`max: 5` per 5 minutes) a whole org would get five password resets
  // total. The token itself must never become the rate-limit key (it is secret material), and the
  // middleware itself is spec-mandated, so the fix is route-level config widening the shared
  // bucket rather than a smarter key.
  test('/reset-password raises admin::rateLimit above the collapsed-bucket default', () => {
    const route = routes.find(
      (r) => r.method === 'POST' && r.path === '/reset-password'
    )! as unknown as {
      config: { middlewares: Array<string | { name: string; config?: { max?: number } }> };
    };

    expect(route).toBeDefined();

    const rateLimitEntry = route.config.middlewares.find(
      (m) => typeof m === 'object' && m.name === 'admin::rateLimit'
    ) as { name: string; config?: { max?: number } } | undefined;

    expect(rateLimitEntry).toBeDefined();
    // Raised well above the middleware's own default of 5 -- a bare `'admin::rateLimit'` string
    // entry (no override) would fail this.
    expect(rateLimitEntry!.config?.max).toBeGreaterThanOrEqual(20);
  });

  test('every other admin::rateLimit route entry is left at the shared default', () => {
    // Pins today's behaviour for the other routes so this test only ever asserts the one
    // deliberate widening, not an accidental blanket change to every rate-limited route.
    //
    // F1 fix: the `find` predicate below used to match only entries that were *already* the bare
    // string `'admin::rateLimit'`, then assert they equal `'admin::rateLimit'` -- a tautology
    // that skipped any route whose entry was an object override entirely (`if (entry !==
    // undefined)` never ran for those). It now also matches the object form (`{ name:
    // 'admin::rateLimit', config: {...} }`), so a route that gained an undocumented override
    // fails here instead of silently passing.
    const otherRateLimited = routes.filter(
      (r) => r.path !== '/reset-password' && r.method === 'POST'
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

  // F1: nothing pinned the two new `/login/mfa/webauthn` routes' existence, their `auth: false`,
  // or their rate limit -- deleting `middlewares: ['admin::rateLimit']` from `POST
  // /login/mfa/webauthn` left the whole `@strapi/admin` server suite green (1240/1240). This
  // enumerates the entire unauthenticated POST login surface -- the plain password login and all
  // three ways to complete an MFA challenge -- so a route disappearing, gaining `auth: true`, or
  // losing its throttle fails here first. Shaped like `routes/__tests__/mfa.test.ts`'s
  // `route(method, path)` + `test.each` pattern.
  describe('the unauthenticated POST login surface is pinned (F1)', () => {
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
