/* eslint-env jest */

import routes from '../authentication';

type RouteEntry = {
  method: string;
  path: string;
  handler: string;
  config: {
    auth?: boolean;
    policies?: Array<string | { name: string; config?: unknown }>;
    middlewares?: Array<string | { name: string; config?: unknown }>;
  };
};

const route = (method: string, path: string): RouteEntry | undefined =>
  (routes as unknown as RouteEntry[]).find((r) => r.method === method && r.path === path);

/**
 * Two names, one job. `admin::mfa-rate-limit` is `admin::rateLimit` applied only while the MFA
 * feature is on, for routes that exist without it and must stay unthrottled when it is off.
 */
const RATE_LIMIT_NAMES = new Set(['admin::rateLimit', 'admin::mfa-rate-limit']);

const limiterName = (m: string | { name: string; config?: unknown }): string | undefined => {
  if (typeof m === 'string') {
    return RATE_LIMIT_NAMES.has(m) ? m : undefined;
  }
  return m !== null && RATE_LIMIT_NAMES.has(m.name) ? m.name : undefined;
};

const hasRateLimitEntry = (
  middlewares: Array<string | { name: string; config?: unknown }> = []
): boolean => middlewares.some((m) => limiterName(m) !== undefined);

describe('authentication routes', () => {
  // Every route whose bucket collapses onto the source IP, because its body carries a token rather
  // than an email. Leaving one at the middleware default is the regression this pins.
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
          typeof m === 'object' && m !== null && limiterName(m) !== undefined
      );

      expect(rateLimit).toBeDefined();
      expect(rateLimit!.config?.max).toBeGreaterThanOrEqual(expected);
    });
  });

  /**
   * `/reset-password` exists with the feature off and behaved differently before this branch, so
   * its limiter has to disappear with the flag. The `/login/mfa*` routes are new and 404 behind
   * `admin::isMfaEnabled`, so the plain limiter is right for them.
   */
  test('only /reset-password uses the flag-gated limiter', () => {
    const gated = (routes as unknown as RouteEntry[])
      .filter((r) =>
        (r.config.middlewares ?? []).some((m) => limiterName(m) === 'admin::mfa-rate-limit')
      )
      .map((r) => r.path);

    expect(gated).toEqual(['/reset-password']);
  });

  test('every other admin::rateLimit route entry is left at the shared default', () => {
    // So this only ever asserts the deliberate widenings above, not a blanket change. The predicate
    // must match the object form as well as the bare string, or the assertion below is a tautology
    // that skips exactly the routes this exists to catch.
    const widened = new Set([
      '/reset-password',
      '/login/mfa',
      '/login/mfa/webauthn/options',
      '/login/mfa/webauthn',
    ]);
    const otherRateLimited = routes.filter(
      (r) => !widened.has(r.path) && r.method === 'POST'
    ) as unknown as Array<{
      path: string;
      config: { middlewares?: Array<string | { name: string; config?: unknown }> };
    }>;

    const entries = otherRateLimited.flatMap((route) =>
      (route.config.middlewares ?? []).filter((m) => limiterName(m) !== undefined)
    );

    // Non-empty first: with the assertion inside a loop over limiter entries, zero entries meant
    // zero assertions, and the test passed having checked nothing. `/login` and `/register-admin`
    // carry the default on develop and must still be found here.
    expect(entries.length).toBeGreaterThanOrEqual(2);
    for (const entry of entries) {
      expect(entry).toBe('admin::rateLimit');
    }
  });

  // The gate lives only on the route, so one missing it runs its handler with the feature off.
  // `/login` must NOT carry it.
  test('the three /login/mfa routes carry admin::isMfaEnabled, and /login does not', () => {
    for (const path of ['/login/mfa', '/login/mfa/webauthn/options', '/login/mfa/webauthn']) {
      expect(route('POST', path)!.config.policies).toContain('admin::isMfaEnabled');
    }
    expect(route('POST', '/login')!.config.policies ?? []).not.toContain('admin::isMfaEnabled');
  });

  // The entire unauthenticated POST login surface, so a route disappearing, gaining `auth: true`,
  // or losing its throttle fails here first. Nothing else covers these.
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
