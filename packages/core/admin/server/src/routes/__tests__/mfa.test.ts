/* eslint-env jest */

import routes from '../mfa';

type RouteEntry = {
  method: string;
  path: string;
  config: { policies: unknown[]; middlewares?: unknown[] };
};

const route = (method: string, path: string): RouteEntry =>
  (routes as unknown as RouteEntry[]).find((r) => r.method === method && r.path === path)!;

// The policies on all six passkey routes, and in particular the exact `hasPermissions` action
// each administrator route carries: nothing else in the package fails if one is dropped.
describe('mfa routes (passkeys)', () => {
  test.each([
    ['POST', '/mfa/passkeys/options'],
    ['POST', '/mfa/passkeys'],
    ['GET', '/mfa/passkeys'],
    ['DELETE', '/mfa/passkeys/:id'],
  ])('%s %s is gated by the feature flag and authentication only', (method, path) => {
    expect(route(method, path).config.policies).toEqual([
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
    ]);
  });

  test('GET /mfa/users/:id/passkeys carries admin::users.read', () => {
    expect(route('GET', '/mfa/users/:id/passkeys').config.policies).toEqual([
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
    ]);
  });

  test('DELETE /mfa/users/:id/passkeys carries admin::users.update', () => {
    expect(route('DELETE', '/mfa/users/:id/passkeys').config.policies).toEqual([
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
    ]);
  });
});

// The two administrator actions that change another account's factor state. Both lower or
// restore access for somebody else, so both carry the same gate the users API uses for a write.
describe('mfa routes (administrator actions on another user)', () => {
  test.each([
    ['POST', '/mfa/users/:id/unlock'],
    ['POST', '/mfa/users/:id/reset'],
  ])('%s %s carries admin::users.update', (method, path) => {
    expect(route(method, path).config.policies).toEqual([
      'admin::isMfaEnabled',
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
    ]);
  });
});

/**
 * The feature-off gate is one registered policy rather than a guard inside each handler, so what
 * has to be pinned is that every route carries it: a new route added without it is the only way a
 * handler could run while the feature is off, and no handler-level test can see that.
 */
describe('every mfa route is gated by the feature flag', () => {
  test.each((routes as unknown as RouteEntry[]).map((r) => [r.method, r.path] as const))(
    '%s %s carries admin::isMfaEnabled first',
    (method, path) => {
      expect(route(method, path).config.policies[0]).toBe('admin::isMfaEnabled');
    }
  );
});

/**
 * A read behind the login-grade limiter is a bug, not a hardening: the default is five requests
 * per five minutes and the key collapses to `unknownEmail:<path>:<ip>`, so one profile visit can
 * spend the whole allowance for every administrator on that address and the section renders its
 * "unavailable" error. Only the routes that check a password or a code carry it.
 */
describe('mfa routes (rate limiting)', () => {
  const CREDENTIAL_ROUTES = [
    ['POST', '/mfa/enrol'],
    ['POST', '/mfa/enrol/verify'],
    ['POST', '/mfa/recovery-codes'],
    ['POST', '/mfa/disable'],
  ] as const;

  test.each(CREDENTIAL_ROUTES)('%s %s is rate limited', (method, path) => {
    expect(route(method, path).config.middlewares).toEqual([
      { name: 'admin::rateLimit', config: { max: 20 } },
    ]);
  });

  const isCredentialRoute = (method: string, path: string) =>
    CREDENTIAL_ROUTES.some(([m, p]) => m === method && p === path);

  test.each(
    (routes as unknown as RouteEntry[])
      .filter((r) => !isCredentialRoute(r.method, r.path))
      .map((r) => [r.method, r.path] as const)
  )('%s %s carries no rate limiter', (method, path) => {
    expect(route(method, path).config.middlewares).toBeUndefined();
  });

  test('every GET is free of the limiter', () => {
    const limitedReads = (routes as unknown as RouteEntry[]).filter(
      (r) => r.method === 'GET' && r.config.middlewares !== undefined
    );
    expect(limitedReads).toEqual([]);
  });
});
