import { expect, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { EndUserCredentials } from '../../strategies/end-users';
import { createQueryMap, fakeStrapi } from '../../__tests__/utils/fake-strapi';

/** A signed-in end user as the strategy leaves it on the request, with the roles given */
export const endUser = (overrides: Partial<EndUserCredentials> = {}): EndUserCredentials => ({
  id: 1,
  documentId: 'user-doc-1',
  email: 'user@example.com',
  username: null,
  name: 'User',
  image: null,
  emailVerified: true,
  roles: [{ documentId: 'role-authenticated', name: 'Authenticated', type: 'authenticated' }],
  ...overrides,
});

/** The request of a caller the named strategy authenticated, with these credentials */
export const requestOf = (credentials: unknown, strategy = 'end-users') => ({
  state: { auth: { strategy: { name: strategy }, credentials } },
});

/** Every caller that is not a signed-in end user */
export const NOT_SIGNED_IN = {
  // The Public role: the strategy authenticates the request with no credentials
  public: requestOf(null),
  // An API token answers before the end-users strategy and carries the token, not a user
  'api token': requestOf({ id: 3, name: 'reader', type: 'read-only' }, 'api-token'),
  // A route with `auth: false` is never authenticated
  'no authentication': { state: {} },
  // The compatibility mode's name, while the mode is off, is not this plugin's strategy
  'users-permissions strategy': requestOf(endUser(), 'users-permissions'),
};

/**
 * What a policy is given besides the request: `{ strapi }`, with the compatibility mode on or off
 * and `db.query` answering the user's row
 */
export const strapiWith = ({
  compat = false,
  userRow = null,
}: { compat?: boolean; userRow?: Record<string, unknown> | null } = {}) => {
  const query = createQueryMap(() => ({ findOne: vi.fn(async () => userRow) }));

  return {
    strapi: fakeStrapi({
      config: {
        get: vi.fn((key: string) =>
          key === 'plugin::end-users.compat.usersPermissions' ? compat : undefined
        ),
      },
      db: { query },
    }) as Core.Strapi,
    query,
  };
};

/** The refusal a policy throws: a `PolicyError` with this code, which core answers with a 403 */
export const refusal = (code: string) =>
  expect.objectContaining({ name: 'PolicyError', details: { code } });
