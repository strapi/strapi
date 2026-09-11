/* eslint-env jest */

import routes from '../mfa';

type RouteEntry = {
  method: string;
  path: string;
  config: { policies: unknown[] };
};

const route = (method: string, path: string): RouteEntry =>
  (routes as unknown as RouteEntry[]).find((r) => r.method === method && r.path === path)!;

// Neither administrator permission gate was asserted anywhere -- removing
// `admin::users.read` from the count route, or `admin::users.update` from the removal route,
// left the whole admin package green. This pins the policies on all six passkey routes,
// and in particular the exact `hasPermissions` action each administrator route carries.
describe('mfa routes (passkeys)', () => {
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

// The two administrator actions that change another account's factor state. Both lower or
// restore access for somebody else, so both carry the same gate the users API uses for a write.
describe('mfa routes (administrator actions on another user)', () => {
  test.each([
    ['POST', '/mfa/users/:id/unlock'],
    ['POST', '/mfa/users/:id/reset'],
  ])('%s %s carries admin::users.update', (method, path) => {
    expect(route(method, path).config.policies).toEqual([
      'admin::isAuthenticatedAdmin',
      { name: 'admin::hasPermissions', config: { actions: ['admin::users.update'] } },
    ]);
  });
});
