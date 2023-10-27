'use strict';

const { isSsoLocked } = require('../sso-lock');

// allow toggling the feature within tests
let ssoEnabled = true;

jest.mock('@strapi/strapi/dist/utils/ee', () => {
  return {
    features: {
      isEnabled() {
        return ssoEnabled;
      },
    },
  };
});

describe('isSsoLocked', () => {
  const lockedRoles = ['1', '2'];

  const userWithLoadedLockedRoles = {
    id: 1,
    email: 'test@example.com',
    password: '123',
  };
  const userWithLockedRoles = {
    id: 1,
    email: 'test@example.com',
    password: '123',
    roles: [{ id: 1 }, { id: 3 }],
  };
  const userWithUnlockedRoles = {
    id: 1,
    email: 'test@example.com',
    password: '123',
    roles: [{ id: 3 }, { id: 4 }],
  };

  global.strapi = {
    query: jest.fn(() => {
      return {
        load: jest.fn(async () => {
          return [{ id: 2 }];
        }),
      };
    }),
    store: jest.fn(() => {
      return {
        get: jest.fn(() => {
          return {
            providers: {
              ssoLockedRoles: lockedRoles,
            },
          };
        }),
      };
    }),
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns true for user with a locked role', async () => {
    ssoEnabled = true;
    expect(await isSsoLocked(userWithLockedRoles)).toBe(true);
  });

  it('returns false for user without a locked role', async () => {
    ssoEnabled = true;
    expect(await isSsoLocked(userWithUnlockedRoles)).toBe(false);
  });

  it('returns false for user with a locked role when SSO is not enabled', async () => {
    ssoEnabled = false;
    expect(await isSsoLocked(userWithLockedRoles)).toBe(false);
  });

  it('queries for roles when user object does not have it populated', async () => {
    ssoEnabled = true;
    expect(await isSsoLocked(userWithLoadedLockedRoles)).toBe(true);
    expect(global.strapi.query).toHaveBeenCalledTimes(1);
  });
});
