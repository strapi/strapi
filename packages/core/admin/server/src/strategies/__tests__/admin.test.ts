/* eslint-env jest */
/* eslint-disable import/no-relative-packages */
import { INTERNAL_CACHE_NS } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
import createContext from '../../../../../../../tests/helpers/create-context';
// @ts-expect-error - types are not generated for this file
import { createMockSessionManager } from '../../../../../../../tests/helpers/create-session-manager-mock';
import adminAuthStrategy, { clearAdminAuthAbilityCache } from '../admin';

type CacheRow = { value: unknown; expiresAt: number | null };

const createDatabaseCacheManagerMock = () => {
  const rows = new Map<string, CacheRow>();

  const compositeKey = (namespace: string, k: string) => `${namespace}\u0000${k}`;

  return {
    get: jest.fn(async (namespace: string, key: string, opts?: { provider?: string }) => {
      if (opts?.provider !== 'database') {
        return null;
      }

      const row = rows.get(compositeKey(namespace, key));
      if (!row) {
        return null;
      }

      if (row.expiresAt !== null && row.expiresAt <= Date.now()) {
        rows.delete(compositeKey(namespace, key));
        return null;
      }

      const now = new Date();
      return {
        value: row.value,
        createdAt: now,
        updatedAt: now,
        expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
      };
    }),

    set: jest.fn(
      async (
        namespace: string,
        key: string,
        value: unknown,
        opts?: { provider?: string; expiresAt?: Date | null }
      ) => {
        if (opts?.provider !== 'database') {
          return;
        }

        const expiresAt = opts?.expiresAt ? opts.expiresAt.getTime() : null;
        rows.set(compositeKey(namespace, key), { value, expiresAt });
      }
    ),

    delete: jest.fn(async (namespace: string, key: string, opts?: { provider?: string }) => {
      if (opts?.provider !== 'database') {
        return;
      }
      rows.delete(compositeKey(namespace, key));
    }),

    __rows: rows,
    __clearAll: () => rows.clear(),
  };
};

describe('Admin Auth Strategy', () => {
  const request = {
    header: {
      authorization: 'Bearer admin_tests-access-token',
    },
  };

  let cacheManager: ReturnType<typeof createDatabaseCacheManagerMock>;
  let deleteMany: jest.Mock;

  const buildStrapi = (opts: {
    validateAccessToken: jest.Mock;
    isSessionActive: jest.Mock;
    findOne: jest.Mock;
    findUserPermissions: jest.Mock;
    generateAbility: jest.Mock;
  }) => {
    deleteMany = jest.fn(async () => ({ count: 1 }));
    deleteMany.mockImplementation(async () => {
      cacheManager.__clearAll();
      return { count: 1 };
    });

    cacheManager = createDatabaseCacheManagerMock();

    return {
      plugins: {},
      api: {},
      sessionManager: createMockSessionManager({
        validateAccessToken: opts.validateAccessToken,
        isSessionActive: opts.isSessionActive,
      }).sessionManager as any,
      cacheManager,
      db: {
        query: jest.fn((uid: string) => {
          if (uid === 'strapi::cache-entry') {
            return { deleteMany };
          }
          return { findOne: opts.findOne };
        }),
      },
      admin: {
        services: {
          permission: {
            findUserPermissions: opts.findUserPermissions,
            engine: { generateAbility: opts.generateAbility },
          },
        },
      },
    } as any;
  };

  const noopCacheManager = () => ({
    get: jest.fn(async () => null),
    set: jest.fn(),
    delete: jest.fn(),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Authenticate a user (sessions-based access token)', () => {
    test('Authenticates a valid access token and active session', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const ctx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1, action: 'read', subject: 'all' }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(isSessionActive).toHaveBeenCalledWith('session-123');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(findUserPermissions).toHaveBeenCalledWith(user);
      expect(generateAbility).toHaveBeenCalled();
      expect(cacheManager.set).toHaveBeenCalledWith(
        INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY,
        'session-123',
        expect.objectContaining({
          permissions: [{ id: 1, action: 'read', subject: 'all' }],
          user: { id: 1, isActive: true, roles: [] },
        }),
        expect.objectContaining({ provider: 'database', expiresAt: expect.any(Date) })
      );
      expect(ctx.state.session).toEqual({ id: 'session-123' });
      expect(response).toStrictEqual({
        authenticated: true,
        credentials: user,
        ability: 'ability',
      });
    });

    test('reuses cached permissions: second request skips findUserPermissions', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const firstCtx = createContext({}, { request, state: {} });
      const secondCtx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1 }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      await adminAuthStrategy.authenticate(firstCtx);
      await adminAuthStrategy.authenticate(secondCtx);

      expect(findUserPermissions).toHaveBeenCalledTimes(1);
      expect(generateAbility).toHaveBeenCalledTimes(2);
      expect(generateAbility).toHaveBeenLastCalledWith([{ id: 1 }], user);
      expect(secondCtx.state.user).toBe(user);
    });

    test('recomputes after cache invalidation (DB-backed clear)', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const firstCtx = createContext({}, { request, state: {} });
      const secondCtx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1 }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      await adminAuthStrategy.authenticate(firstCtx);
      await clearAdminAuthAbilityCache();
      await adminAuthStrategy.authenticate(secondCtx);

      expect(deleteMany).toHaveBeenCalledWith({
        where: { namespace: INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY },
      });
      expect(findUserPermissions).toHaveBeenCalledTimes(2);
    });

    test('treats expired cache entries as misses', async () => {
      jest.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(61_000);

      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const firstCtx = createContext({}, { request, state: {} });
      const secondCtx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1 }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      await adminAuthStrategy.authenticate(firstCtx);
      await adminAuthStrategy.authenticate(secondCtx);

      expect(findUserPermissions).toHaveBeenCalledTimes(2);
    });

    test('does not store password, reset, or registration tokens in the auth cache', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const ctx = createContext({}, { request, state: {} });
      const user = {
        id: 1,
        isActive: true,
        email: 'admin@example.com',
        firstname: 'Ada',
        password: '$2a$10$hashed-password',
        resetPasswordToken: 'reset-token',
        resetPasswordTokenExpiresAt: '2030-01-01T00:00:00.000Z',
        registrationToken: 'registration-token',
        roles: [
          {
            id: 3,
            code: 'strapi-super-admin',
            name: 'Super Admin',
            description: 'Full access',
            users: [{ id: 9, password: '$2a$10$other-user' }],
          },
        ],
      } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1, action: 'read' }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({
        authenticated: true,
        credentials: user,
        ability: 'ability',
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY,
        'session-123',
        {
          permissions: [{ id: 1, action: 'read' }],
          user: {
            id: 1,
            isActive: true,
            roles: [{ id: 3, code: 'strapi-super-admin' }],
          },
        },
        expect.objectContaining({ provider: 'database', expiresAt: expect.any(Date) })
      );
      const stored = JSON.stringify(cacheManager.set.mock.calls[0][2]);
      expect(stored).not.toContain('hashed-password');
      expect(stored).not.toContain('reset-token');
      expect(stored).not.toContain('registration-token');
      expect(stored).not.toContain('other-user');
      expect(stored).not.toContain('admin@example.com');
    });

    test('rejects a deactivated user when the auth cache hits', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const firstCtx = createContext({}, { request, state: {} });
      const secondCtx = createContext({}, { request, state: {} });
      const activeUser = {
        id: 1,
        isActive: true,
        email: 'admin@example.com',
        password: '$2a$10$hashed-password',
        roles: [{ id: 3, code: 'strapi-author' }],
      } as any;
      const findOne = jest
        .fn()
        .mockResolvedValueOnce(activeUser)
        .mockResolvedValueOnce({ ...activeUser, isActive: false });
      const findUserPermissions = jest.fn(async () => [{ id: 1 }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      const firstResponse = await adminAuthStrategy.authenticate(firstCtx);
      const secondResponse = await adminAuthStrategy.authenticate(secondCtx);

      expect(firstResponse).toStrictEqual({
        authenticated: true,
        credentials: activeUser,
        ability: 'ability',
      });
      expect(secondResponse).toStrictEqual({ authenticated: false });
      expect(secondCtx.state.user).toBeUndefined();
      expect(findUserPermissions).toHaveBeenCalledTimes(1);
      expect(generateAbility).toHaveBeenCalledTimes(1);
      expect(cacheManager.delete).toHaveBeenCalledWith(
        INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY,
        'session-123',
        { provider: 'database' }
      );
    });

    test('rejects an inactive session even when the cache was already warmed', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest
        .fn(async () => true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      const firstCtx = createContext({}, { request, state: {} });
      const secondCtx = createContext({}, { request, state: {} });
      const thirdCtx = createContext({}, { request, state: {} });
      const user = { id: 1, isActive: true } as any;
      const findOne = jest.fn(() => user);
      const findUserPermissions = jest.fn(async () => [{ id: 1 }]);
      const generateAbility = jest.fn(async () => 'ability');

      global.strapi = buildStrapi({
        validateAccessToken,
        isSessionActive,
        findOne,
        findUserPermissions,
        generateAbility,
      });

      await adminAuthStrategy.authenticate(firstCtx);
      const secondResponse = await adminAuthStrategy.authenticate(secondCtx);
      await adminAuthStrategy.authenticate(thirdCtx);

      expect(secondResponse).toStrictEqual({ authenticated: false });
      expect(cacheManager.delete).toHaveBeenCalledWith(
        INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY,
        'session-123',
        {
          provider: 'database',
        }
      );
      expect(findUserPermissions).toHaveBeenCalledTimes(2);
    });

    test('Fails to authenticate if the authorization header is missing', async () => {
      const ctx = createContext({}, { request: { header: {} } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid authorization header', async () => {
      const ctx = createContext({}, { request: { header: { authorization: 'invalid-header' } } });

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid bearer token', async () => {
      const validateAccessToken = jest.fn(() => ({ isValid: false, payload: null }));
      const ctx = createContext({}, { request });

      const { sessionManager } = createMockSessionManager({ validateAccessToken });

      global.strapi = {
        plugins: {},
        api: {},
        sessionManager: sessionManager as any,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate when session is not active', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => false);
      const ctx = createContext({}, { request });

      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      const cacheManager = noopCacheManager();

      global.strapi = {
        plugins: {},
        api: {},
        sessionManager: sessionManager as any,
        cacheManager,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(isSessionActive).toHaveBeenCalledWith('session-123');
      expect(cacheManager.delete).toHaveBeenCalledWith(
        INTERNAL_CACHE_NS.ADMIN_AUTH_ABILITY,
        'session-123',
        {
          provider: 'database',
        }
      );
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate an invalid user', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const ctx = createContext({}, { request });
      const findOne = jest.fn(() => ({ isActive: false }));

      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      const cacheManager = noopCacheManager();

      global.strapi = {
        plugins: {},
        api: {},
        admin: { services: {} },
        sessionManager: sessionManager as any,
        db: { query: jest.fn(() => ({ findOne })) },
        cacheManager,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });

    test('Fails to authenticate a non-existing user', async () => {
      const validateAccessToken = jest.fn(() => ({
        isValid: true,
        payload: { userId: '1', sessionId: 'session-123', type: 'access', exp: 0, iat: 0 },
      }));
      const isSessionActive = jest.fn(async () => true);
      const ctx = createContext({}, { request });
      const findOne = jest.fn(() => null);

      const { sessionManager } = createMockSessionManager({ validateAccessToken, isSessionActive });

      const cacheManager = noopCacheManager();

      global.strapi = {
        plugins: {},
        api: {},
        admin: { services: {} },
        sessionManager: sessionManager as any,
        db: { query: jest.fn(() => ({ findOne })) },
        cacheManager,
      } as any;

      const response = await adminAuthStrategy.authenticate(ctx);

      expect(validateAccessToken).toHaveBeenCalledWith('admin_tests-access-token');
      expect(findOne).toHaveBeenCalledWith({ where: { id: 1 }, populate: ['roles'] });
      expect(response).toStrictEqual({ authenticated: false });
    });
  });
});
