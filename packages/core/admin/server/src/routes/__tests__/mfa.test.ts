/* eslint-env jest */

import routes from '../mfa';

type RouteEntry = {
  method: string;
  path: string;
  config: { policies: unknown[] };
};

const route = (method: string, path: string): RouteEntry =>
  (routes as unknown as RouteEntry[]).find((r) => r.method === method && r.path === path)!;

// F2: neither administrator permission gate was asserted anywhere -- removing
// `admin::users.read` from the count route, or `admin::users.update` from the removal route,
// left the whole admin package green. This pins the policies on all six cycle-4 passkey routes,
// and in particular the exact `hasPermissions` action each administrator route carries.
describe('mfa routes (passkeys, cycle 4)', () => {
  test.each([
    ['POST', '/mfa/passkeys/options'],
    ['POST', '/mfa/passkeys'],
    ['GET', '/mfa/passkeys'],
    ['DELETE', '/mfa/passkeys/:id'],
  ])('%s %s is gated by admin::isAuthenticatedAdmin only', (method, path) => {
    expect(route(method, path).config.policies).toEqual(['admin::isAuthenticatedAdmin']);
  });

  test('GET /mfa/users/:id/passkeys carries admin::users.read', () => {
    expect(route('GET', '/mfa/users/:id/passkeys').config.policies).toEqual([
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.read'] } },
    ]);
  });

  test('DELETE /mfa/users/:id/passkeys carries admin::users.update', () => {
    expect(route('DELETE', '/mfa/users/:id/passkeys').config.policies).toEqual([
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
    ]);
  });
});
