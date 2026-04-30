import { errors } from '@strapi/utils';
import createContext from '../../../test-utils/create-context';
import adminTokenStrategy from '../admin-token';

describe('Admin Token Auth Strategy', () => {
  /** User row loaded with `populate: ['roles']` (see admin-token strategy). */
  const activeUserWithRoles = {
    id: 42,
    isActive: true,
    blocked: false,
    roles: [] as { code: string }[],
  };
  const ownerDto = {
    id: activeUserWithRoles.id,
    firstname: 'Token',
    lastname: 'Owner',
    username: 'token-owner',
    email: 'owner@test.com',
  };

  const adminTokenBase = {
    id: 2,
    kind: 'admin',
    name: 'admin-token-test',
    description: '',
    adminPermissions: [],
  };

  const update = jest.fn();
  const hash = jest.fn(() => 'api-token_tests-hashed-access-key');
  const generateTokenAbility = jest.fn(() => Promise.resolve({ can: jest.fn() }));

  const makeStrapi = (
    getByAccessKey: jest.Mock,
    findOneUser: jest.Mock = jest.fn(() => activeUserWithRoles),
    adminTokensEnabled = true
  ) => {
    const authenticateAdminToken = jest.fn(async () => {
      if (global.strapi.features.future.isEnabled('adminTokens') !== true) {
        return { authenticated: false };
      }

      const apiToken = await getByAccessKey(hash());
      if (apiToken === null || apiToken === undefined || apiToken.kind !== 'admin') {
        return { authenticated: false };
      }

      const expiresAt = apiToken.expiresAt;
      if (expiresAt !== null && expiresAt !== undefined && new Date(expiresAt) < new Date()) {
        return { authenticated: false, error: new errors.UnauthorizedError('Token expired') };
      }

      await update(apiToken);

      const owner = apiToken.adminUserOwner;
      const ownerId =
        // eslint-disable-next-line no-nested-ternary
        owner === null || owner === undefined ? null : typeof owner === 'object' ? owner.id : owner;

      if (ownerId === null) {
        return {
          authenticated: false,
          error: new errors.UnauthorizedError('Token owner not found'),
        };
      }

      const user = await findOneUser({ where: { id: ownerId }, populate: ['roles'] });
      if (user === null || user === undefined) {
        return {
          authenticated: false,
          error: new errors.UnauthorizedError('Token owner not found'),
        };
      }

      if (user.isActive !== true || user.blocked === true) {
        return {
          authenticated: false,
          error: new errors.UnauthorizedError('Token owner is deactivated'),
        };
      }

      const ability = await generateTokenAbility();
      return { authenticated: true, credentials: apiToken, user, ability };
    });

    return {
      features: {
        future: {
          isEnabled: jest.fn((featureName: string) => {
            return featureName === 'adminTokens' ? adminTokensEnabled : false;
          }),
        },
      },
      admin: {
        services: {
          'api-token-admin': { getByAccessKey, hash, authenticateAdminToken },
          permission: { engine: { generateTokenAbility } },
        },
      },
      db: {
        query(uid: string) {
          if (uid === 'admin::user') {
            return { findOne: findOneUser };
          }
          return { update };
        },
      },
    };
  };

  const adminRouteCtx = (authorization = 'Bearer test-token') =>
    createContext(
      {},
      {
        request: { header: { authorization } },
        state: { route: { info: { type: 'admin' } } },
      }
    );

  describe('Authenticate an admin token', () => {
    test('Authenticates an admin token when owner is active and not blocked', async () => {
      const findOneUser = jest.fn(() => activeUserWithRoles);
      const token = { ...adminTokenBase, adminUserOwner: ownerDto };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();

      global.strapi = makeStrapi(getByAccessKey, findOneUser) as any;

      const response = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(response.authenticated).toBe(true);
      expect(response.credentials).toBe(token);
      expect(response.ability).toBeDefined();
      expect(ctx.state.userAbility).toBeDefined();
      expect(ctx.state.user).toBe(activeUserWithRoles);
      expect(findOneUser).toHaveBeenCalledWith({
        where: { id: ownerDto.id },
        populate: ['roles'],
      });
      expect(generateTokenAbility).toHaveBeenCalledWith([], activeUserWithRoles);
    });

    test('Rejects admin token authentication when the future flag is disabled', async () => {
      const getByAccessKey = jest.fn();
      const ctx = adminRouteCtx();

      global.strapi = makeStrapi(
        getByAccessKey,
        jest.fn(() => activeUserWithRoles),
        false
      ) as any;

      const response = await adminTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
      expect(getByAccessKey).not.toHaveBeenCalled();
    });

    test('Fails to authenticate when loaded owner isActive is false', async () => {
      const token = { ...adminTokenBase, adminUserOwner: ownerDto };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();
      const findOneUser = jest.fn(() => ({ ...activeUserWithRoles, isActive: false }));

      global.strapi = makeStrapi(getByAccessKey, findOneUser) as any;

      const { authenticated, error } = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.message).toBe('Token owner is deactivated');
    });

    test('Fails to authenticate when loaded owner is blocked', async () => {
      const token = { ...adminTokenBase, adminUserOwner: ownerDto };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();
      const findOneUser = jest.fn(() => ({ ...activeUserWithRoles, blocked: true }));

      global.strapi = makeStrapi(getByAccessKey, findOneUser) as any;

      const { authenticated, error } = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.message).toBe('Token owner is deactivated');
    });

    test('Authenticates when adminUserOwner is a bare ID and the owner can be loaded', async () => {
      const token = { ...adminTokenBase, adminUserOwner: 42 };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();

      global.strapi = makeStrapi(getByAccessKey) as any;

      const response = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(response.authenticated).toBe(true);
      expect(ctx.state.user).toBe(activeUserWithRoles);
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await adminTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Expired token returns authenticated: false with UnauthorizedError', async () => {
      const pastDate = new Date(Date.now() - 1).toISOString();
      const token = { ...adminTokenBase, adminUserOwner: ownerDto, expiresAt: pastDate };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();

      global.strapi = makeStrapi(getByAccessKey) as any;

      const { authenticated, error } = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.message).toBe('Token expired');
    });

    test('Rejects an admin token on a content-api route (defensive kind check)', async () => {
      const ctx = createContext(
        {},
        {
          request: { header: { authorization: 'Bearer test-token' } },
          state: { route: { info: { type: 'content-api' } } },
        }
      );

      // content-api-token strategy would be called here, but we test the admin-token strategy
      // directly to confirm it rejects non-admin tokens defensively
      const contentApiToken = { id: 1, kind: 'content-api', type: 'read-only' };
      const getContentApiToken = jest.fn(() => contentApiToken);

      global.strapi = makeStrapi(getContentApiToken) as any;

      const response = await adminTokenStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate when the owner user cannot be loaded', async () => {
      const token = { ...adminTokenBase, adminUserOwner: ownerDto };
      const getByAccessKey = jest.fn(() => token);
      const ctx = adminRouteCtx();
      const findOneUser = jest.fn(() => null);

      global.strapi = makeStrapi(getByAccessKey, findOneUser) as any;

      const { authenticated, error } = (await adminTokenStrategy.authenticate(ctx)) as any;

      expect(authenticated).toBe(false);
      expect(error).toBeInstanceOf(errors.UnauthorizedError);
      expect(error.message).toBe('Token owner not found');
    });
  });

  describe('Verify', () => {
    test('Returns without throwing for a valid token with no expiry', () => {
      expect(adminTokenStrategy.verify({ credentials: { id: 2, kind: 'admin' } })).toBeUndefined();
    });

    test('Returns without throwing for a valid token with a future expiry', () => {
      const futureDate = new Date(Date.now() + 60_000).toISOString();
      expect(
        adminTokenStrategy.verify({ credentials: { id: 2, kind: 'admin', expiresAt: futureDate } })
      ).toBeUndefined();
    });

    test('Throws UnauthorizedError if credentials are missing', () => {
      expect(() => adminTokenStrategy.verify({})).toThrow(errors.UnauthorizedError);
      expect(() => adminTokenStrategy.verify({})).toThrow('Token not found');
    });

    test('Throws UnauthorizedError for an expired token', () => {
      const pastDate = new Date(Date.now() - 1).toISOString();
      expect(() =>
        adminTokenStrategy.verify({ credentials: { id: 2, kind: 'admin', expiresAt: pastDate } })
      ).toThrow(errors.UnauthorizedError);
      expect(() =>
        adminTokenStrategy.verify({ credentials: { id: 2, kind: 'admin', expiresAt: pastDate } })
      ).toThrow('Token expired');
    });
  });
});
