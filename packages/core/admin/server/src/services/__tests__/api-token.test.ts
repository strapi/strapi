import crypto from 'crypto';
import { errors } from '@strapi/utils';
import { omit, uniq } from 'lodash/fp';
import type { ContentApiApiToken } from '../../../../shared/contracts/api-token';
import constants from '../constants';
import {
  create as apiTokenCreate,
  regenerate,
  checkSaltIsDefined,
  hash,
  list,
  revoke,
  getById,
  update as apiTokenUpdate,
  getByName,
  reconcileTokenPermissionsToUserCeiling,
  syncApiTokenPermissionsForUser,
  enforceAdminPermissionsCeiling,
} from '../api-token';
import encryptionService from '../encryption';

const getActionProvider = (actions = []) => {
  return {
    contentAPI: { permissions: { providers: { action: { keys: jest.fn(() => actions) } } } },
  };
};

describe('API Token', () => {
  const mockedApiToken = {
    randomBytes: 'api-token_test-random-bytes',
    hexedString: '6170692d746f6b656e5f746573742d72616e646f6d2d6279746573',
  };

  const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

  const setupStrapiMock = (overrides = {}) => {
    global.strapi = {
      db: {
        query: jest.fn(() => ({})),
      },
      config: {
        get: jest.fn((key) => {
          if (key === 'admin.secrets') {
            return { encryptionKey: ENCRYPTION_KEY };
          }
          if (key === 'admin.apiToken') {
            return { salt: 'api-token_tests-salt' };
          }
          return '';
        }),
      },
      admin: {
        services: {
          encryption: encryptionService,
        },
      },
      ...overrides,
    } as any;
  };

  let now: any;
  let nowSpy: any;

  beforeAll(() => {
    jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementation(() => Buffer.from(mockedApiToken.randomBytes));

    // To eliminate latency in the request and predict the expiry timestamp, we freeze Date.now()
    now = Date.now();
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterAll(() => {
    nowSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('Creates a new read-only token', async () => {
      const create = jest.fn(({ data }) => Promise.resolve(data));
      const callingUser = { id: 1, roles: [] } as any;

      setupStrapiMock({
        db: {
          query() {
            return { create };
          },
        },
      });

      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      } as any;

      const res = await apiTokenCreate(attributes, callingUser);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...attributes,
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
          adminUserOwner: null,
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });

      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
        encryptedKey: expect.any(String),
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a new token with lifespan', async () => {
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        lifespan: constants.API_TOKEN_LIFESPANS.DAYS_90,
      } as any;

      const expectedExpires = Date.now() + attributes.lifespan;
      const callingUser = { id: 1, roles: [] } as any;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      setupStrapiMock({
        db: {
          query() {
            return { create };
          },
        },
      });

      const res = await apiTokenCreate(attributes, callingUser);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...attributes,
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
          adminUserOwner: null,
          expiresAt: expectedExpires,
          lifespan: attributes.lifespan,
        },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
        encryptedKey: expect.any(String),
        expiresAt: expectedExpires,
        lifespan: attributes.lifespan,
      });
      expect(res.expiresAt).toBe(expectedExpires);
    });

    test('It throws when creating a token with invalid lifespan', async () => {
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        lifespan: 12345,
      } as any;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      setupStrapiMock({
        db: {
          query() {
            return { create };
          },
        },
      });

      expect(async () => {
        await apiTokenCreate(attributes);
      }).rejects.toThrow(/lifespan/);

      expect(create).not.toHaveBeenCalled();
    });

    test('Creates a custom token', async () => {
      const callingUser = { id: 1, roles: [] } as any;
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['admin::content.content.read'],
      } as any;

      const createTokenResult = {
        ...attributes,
        adminUserOwner: null,
        lifespan: null,
        expiresAt: null,
        id: 1,
      };

      const findOne = jest.fn().mockResolvedValue(omit('permissions', createTokenResult));
      const create = jest.fn().mockResolvedValue(createTokenResult);
      const load = jest.fn().mockResolvedValueOnce(
        Promise.resolve(
          attributes.permissions.map((p: any) => {
            return {
              action: p,
            };
          })
        )
      );

      setupStrapiMock({
        ...getActionProvider(['admin::content.content.read'] as any),
        db: {
          query() {
            return {
              findOne,
              create,
              load,
            };
          },
        },
      });

      const res = await apiTokenCreate(attributes, callingUser);

      expect(load).toHaveBeenCalledWith(
        {
          ...createTokenResult,
        },
        'permissions'
      );

      // call to create token
      expect(create).toHaveBeenNthCalledWith(1, {
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...omit('permissions', attributes),
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
          adminUserOwner: null,
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      // call to create permission
      expect(create).toHaveBeenNthCalledWith(2, {
        data: {
          action: 'admin::content.content.read',
          token: {
            ...createTokenResult,
            expiresAt: null,
            lifespan: null,
          },
        },
      });

      expect(res).toEqual({
        ...omit('adminUserOwner', createTokenResult),
        accessKey: mockedApiToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a custom token with no permissions', async () => {
      const callingUser = { id: 1, roles: [] } as any;
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: [],
      } as any;

      const createTokenResult = {
        ...attributes,
        adminUserOwner: null,
        lifespan: null,
        expiresAt: null,
        id: 1,
      };

      const findOne = jest.fn().mockResolvedValue(omit('permissions', createTokenResult));
      const create = jest.fn().mockResolvedValue(createTokenResult);
      const load = jest.fn().mockResolvedValueOnce(
        Promise.resolve(
          attributes.permissions.map((p: any) => {
            return {
              action: p,
            };
          })
        )
      );

      setupStrapiMock({
        ...getActionProvider(['admin::content.content.read'] as any),
        db: {
          query() {
            return {
              findOne,
              create,
              load,
            };
          },
        },
      });

      const res = await apiTokenCreate(attributes, callingUser);

      expect(load).toHaveBeenCalledWith(
        {
          ...createTokenResult,
        },
        'permissions'
      );

      // call to create token
      expect(create).toHaveBeenCalledTimes(1);
      expect(create).toHaveBeenNthCalledWith(1, {
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...omit('permissions', attributes),
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
          adminUserOwner: null,
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });

      expect(res).toEqual({
        ...omit('adminUserOwner', createTokenResult),
        accessKey: mockedApiToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a custom token with duplicate permissions should ignore duplicates', async () => {
      const callingUser = { id: 1, roles: [] } as any;
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['api::foo.foo.find', 'api::foo.foo.find', 'api::foo.foo.create'],
      } as any;

      const createTokenResult = {
        ...attributes,
        adminUserOwner: callingUser.id,
        lifespan: null,
        expiresAt: null,
        id: 1,
      };

      const findOne = jest.fn().mockResolvedValue(omit('permissions', createTokenResult));
      const create = jest.fn().mockResolvedValue(createTokenResult);
      const load = jest.fn().mockResolvedValueOnce(
        Promise.resolve(
          uniq(attributes.permissions).map((p: any) => {
            return {
              action: p,
            };
          })
        )
      );

      setupStrapiMock({
        ...getActionProvider(['api::foo.foo.find', 'api::foo.foo.create'] as any),
        db: {
          query() {
            return {
              findOne,
              create,
              load,
            };
          },
        },
      });

      const res = (await apiTokenCreate(attributes, callingUser)) as ContentApiApiToken;

      expect(res.permissions).toHaveLength(2);
      expect(res.permissions).toEqual(['api::foo.foo.find', 'api::foo.foo.create']);
    });

    test('Creates a custom token with invalid permissions should throw', async () => {
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['valid-permission', 'unknown-permission-A', 'unknown-permission-B'],
      } as any;

      const createTokenResult = {
        ...attributes,
        lifespan: null,
        expiresAt: null,
        id: 1,
      };

      const create = jest.fn().mockResolvedValue(createTokenResult);
      const load = jest.fn().mockResolvedValueOnce(
        Promise.resolve(
          uniq(attributes.permissions).map((p: any) => {
            return {
              action: p,
            };
          })
        )
      );

      setupStrapiMock({
        ...getActionProvider(['valid-permission'] as any),
        db: {
          query() {
            return {
              create,
              load,
            };
          },
        },
      });

      await expect(() => apiTokenCreate(attributes)).rejects.toThrowError(
        new errors.ApplicationError(
          `Unknown permissions provided: unknown-permission-A, unknown-permission-B`
        )
      );

      expect(load).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });

    test('Throws when creating a content API token with adminPermissions', async () => {
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        adminPermissions: [{ action: 'some.admin.action' }],
      } as any;

      setupStrapiMock({});

      await expect(() => apiTokenCreate(attributes)).rejects.toThrow(
        'Legacy tokens cannot carry admin permissions'
      );
    });

    test('Throws when creating a content API token with adminUserOwner', async () => {
      const attributes = {
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        adminUserOwner: 42,
      } as any;

      setupStrapiMock({});

      await expect(() => apiTokenCreate(attributes)).rejects.toThrow(
        'Legacy tokens cannot have an admin user owner'
      );
    });

    test('Throws when creating an admin token with a content API type', async () => {
      const attributes = {
        kind: 'admin',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      } as any;

      setupStrapiMock({});

      await expect(() => apiTokenCreate(attributes)).rejects.toThrow(
        'Admin tokens cannot carry a legacy type'
      );
    });

    test('Throws when creating an admin token with content-API permissions', async () => {
      const attributes = {
        kind: 'admin',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        permissions: ['api::foo.foo.find'],
      } as any;

      setupStrapiMock({});

      await expect(() => apiTokenCreate(attributes)).rejects.toThrow(
        'Admin tokens cannot carry legacy content-API permissions'
      );
    });

    test('Throws when creating an admin token without a callingUser', async () => {
      const attributes = {
        kind: 'admin',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
      } as any;

      setupStrapiMock({});

      await expect(() => apiTokenCreate(attributes)).rejects.toThrow(
        'Creating an admin token requires an authenticated admin user'
      );
    });

    test('Creates an admin token and defaults owner to callingUser', async () => {
      const callingUser = { id: 1, roles: [] } as any;
      const attributes = {
        kind: 'admin',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
      } as any;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      setupStrapiMock({
        db: {
          query() {
            return { create };
          },
        },
      });

      const res = await apiTokenCreate(attributes, callingUser);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining(['kind']),
        data: {
          ...attributes,
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
          adminUserOwner: callingUser.id,
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
        encryptedKey: expect.any(String),
        adminUserOwner: callingUser.id,
        expiresAt: null,
        lifespan: null,
      });
    });
  });

  describe('checkSaltIsDefined', () => {
    test('It does nothing if the salt is already defined', () => {
      const mockedAppendFile = jest.fn();
      const mockedConfigSet = jest.fn();

      global.strapi = {
        config: {
          get: jest.fn((key) => {
            if (key === 'admin.apiToken') {
              return { salt: 'api-token_tests-salt' };
            }
            return undefined;
          }),
          set: mockedConfigSet,
        },
      } as any;

      setupStrapiMock({
        config: {
          get: jest.fn((key) => {
            if (key === 'admin.apiToken') {
              return { salt: 'api-token_tests-salt' };
            }
            return undefined;
          }),
          set: mockedConfigSet,
        },
      });

      checkSaltIsDefined();

      expect(mockedAppendFile).not.toHaveBeenCalled();
      expect(mockedConfigSet).not.toHaveBeenCalled();
    });

    test('It throws if the salt is not defined', () => {
      setupStrapiMock({
        config: {
          get: jest.fn(() => null),
        },
      });

      try {
        checkSaltIsDefined();
      } catch (e: any) {
        expect(e.message.includes('Missing apiToken.salt.')).toBe(true);
      }

      expect.assertions(1);
    });

    test('It throws an error if the env variable used in the config file has been changed and is empty', () => {
      expect.assertions(1);
      process.env.API_TOKEN_SALT = 'api-token_tests-salt';

      global.strapi = {
        config: {
          get: jest.fn(() => null),
        },
      } as any;

      try {
        checkSaltIsDefined();
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
      }
    });
  });

  describe('list', () => {
    const tokens = [
      {
        id: 1,
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      },
      {
        id: 2,
        name: 'api-token_tests-name-2',
        description: 'api-token_tests-description-2',
        type: 'full-access',
      },
    ];

    test('It lists all the tokens (super admin sees all)', async () => {
      const findMany = jest.fn().mockResolvedValue(tokens);
      const superAdmin = { id: 1, roles: [{ code: 'strapi-super-admin' }] } as any;

      global.strapi = {
        db: {
          query() {
            return { findMany };
          },
        },
      } as any;

      const res = await list(superAdmin);

      expect(findMany).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        orderBy: { name: 'ASC' },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
        where: {},
      });
      expect(res).toEqual(tokens);
    });

    test('Non-super-admin only sees ownerless tokens and own tokens', async () => {
      const findMany = jest.fn().mockResolvedValue(tokens);
      const regularUser = { id: 2, roles: [{ code: 'strapi-editor' }] } as any;

      global.strapi = {
        db: {
          query() {
            return { findMany };
          },
        },
      } as any;

      await list(regularUser);

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            $or: [{ adminUserOwner: null }, { adminUserOwner: { id: regularUser.id } }],
          },
        })
      );
    });
  });

  describe('revoke', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('It deletes the token', async () => {
      const mockedFindOne = jest.fn().mockResolvedValue({ id: token.id, adminPermissions: [] });
      const mockedDelete = jest.fn().mockResolvedValue(token);

      global.strapi = {
        db: {
          query() {
            return { findOne: mockedFindOne, delete: mockedDelete };
          },
        },
        admin: {
          services: {
            permission: { deleteByIds: jest.fn() },
          },
        },
      } as any;

      const res = await revoke(token.id);

      expect(mockedFindOne).toHaveBeenCalledWith({
        where: { id: token.id },
        select: ['id'],
        populate: ['adminPermissions'],
      });
      expect(mockedDelete).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: token.id },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      expect(res).toEqual(token);
    });

    test('It returns `null` if the resource does not exist', async () => {
      const mockedFindOne = jest.fn().mockResolvedValue(null);
      const mockedDelete = jest.fn().mockResolvedValue(null);
      const mockedDeleteByIds = jest.fn();

      global.strapi = {
        db: {
          query() {
            return { findOne: mockedFindOne, delete: mockedDelete };
          },
        },
        admin: {
          services: {
            permission: { deleteByIds: mockedDeleteByIds },
          },
        },
      } as any;

      const res = await revoke(42);

      expect(mockedDeleteByIds).not.toHaveBeenCalled();
      expect(mockedDelete).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: 42 },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });

      expect(res).toEqual(null);
    });

    test('It deletes adminPermissions before the token for admin tokens', async () => {
      const adminToken = { id: 5, adminPermissions: [{ id: 101 }, { id: 102 }] };
      const mockedFindOne = jest.fn().mockResolvedValue(adminToken);
      const mockedDelete = jest.fn().mockResolvedValue(adminToken);
      const mockedDeleteByIds = jest.fn().mockResolvedValue({});

      global.strapi = {
        db: {
          query() {
            return { findOne: mockedFindOne, delete: mockedDelete };
          },
        },
        admin: {
          services: {
            permission: { deleteByIds: mockedDeleteByIds },
          },
        },
      } as any;

      await revoke(adminToken.id);

      expect(mockedDeleteByIds).toHaveBeenCalledWith([101, 102]);
      expect(mockedDelete).toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('It retrieves the token', async () => {
      const findOne = jest.fn().mockResolvedValue(token);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await getById(token.id);

      expect(findOne).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: token.id },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      // getBy normalizes: adds kind (default content-api for legacy tokens when missing from DB)
      expect(res).toEqual({ ...token, kind: 'content-api', permissions: [] });
    });

    test('It returns `null` if the resource does not exist', async () => {
      const findOne = jest.fn().mockResolvedValue(null);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await getById(42);

      expect(findOne).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: 42 },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      expect(res).toEqual(null);
    });

    describe('kind defaulting (legacy tokens created before kind introduction)', () => {
      test('Defaults kind to "content-api" when DB returns kind null', async () => {
        const tokenFromDb = {
          id: 1,
          name: 'api-token_tests-name',
          description: 'api-token_tests-description',
          type: 'read-only',
          kind: null,
          permissions: [],
        };

        const findOne = jest.fn().mockResolvedValue(tokenFromDb);

        global.strapi = {
          db: {
            query() {
              return { findOne };
            },
          },
        } as any;

        const res = await getById(1);

        expect(res).not.toBeNull();
        expect(res?.kind).toBe('content-api');
      });

      test('Defaults kind to "content-api" when DB returns kind undefined', async () => {
        const tokenFromDb = {
          id: 1,
          name: 'api-token_tests-name',
          description: 'api-token_tests-description',
          type: 'read-only',
          permissions: [],
        };
        expect((tokenFromDb as any).kind).toBeUndefined();

        const findOne = jest.fn().mockResolvedValue(tokenFromDb);

        global.strapi = {
          db: {
            query() {
              return { findOne };
            },
          },
        } as any;

        const res = await getById(1);

        expect(res).not.toBeNull();
        expect(res?.kind).toBe('content-api');
      });

      test('Preserves kind when DB returns explicit kind "admin"', async () => {
        const tokenFromDb = {
          id: 1,
          kind: 'admin',
          name: 'api-token_tests-name',
          description: 'api-token_tests-description',
          adminUserOwner: 1,
          permissions: [],
          adminPermissions: [],
        };

        const findOne = jest.fn().mockResolvedValue(tokenFromDb);

        global.strapi = {
          db: {
            query() {
              return { findOne };
            },
          },
        } as any;

        const res = await getById(1);

        expect(res).not.toBeNull();
        expect(res?.kind).toBe('admin');
      });

      test('Preserves kind when DB returns explicit kind "content-api"', async () => {
        const tokenFromDb = {
          id: 1,
          kind: 'content-api',
          name: 'api-token_tests-name',
          description: 'api-token_tests-description',
          type: 'read-only',
          permissions: [],
        };

        const findOne = jest.fn().mockResolvedValue(tokenFromDb);

        global.strapi = {
          db: {
            query() {
              return { findOne };
            },
          },
        } as any;

        const res = await getById(1);

        expect(res).not.toBeNull();
        expect(res?.kind).toBe('content-api');
      });
    });
  });

  describe('regenerate', () => {
    test('It regenerates the accessKey', async () => {
      const update = jest.fn(({ data }) => Promise.resolve(data));

      setupStrapiMock({
        db: {
          query() {
            return { update };
          },
        },
      });
      const id = 1;
      const res = await regenerate(id);

      expect(update).toHaveBeenCalledWith({
        where: { id },
        select: ['id', 'accessKey'],
        data: {
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
        },
      });
      expect(res).toEqual({
        accessKey: mockedApiToken.hexedString,
        encryptedKey: expect.any(String),
      });
    });

    test('It throws a NotFound if the id is not found', async () => {
      const update = jest.fn(() => Promise.resolve(null));

      setupStrapiMock({
        db: {
          query() {
            return { update };
          },
        },
      });

      const id = 1;
      await expect(async () => {
        await regenerate(id);
      }).rejects.toThrowError(errors.NotFoundError);

      expect(update).toHaveBeenCalledWith({
        where: { id },
        select: ['id', 'accessKey'],
        data: {
          accessKey: hash(mockedApiToken.hexedString),
          encryptedKey: expect.any(String),
        },
      });
    });
  });

  describe('update', () => {
    test('Updates a non-custom token', async () => {
      const token = {
        id: 1,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const update = jest.fn(({ data }) => Promise.resolve(data));
      const deleteFn = jest.fn(({ data }) => Promise.resolve(data));
      const findOne = jest.fn().mockResolvedValue(token);
      const load = jest.fn();

      global.strapi = {
        db: {
          query() {
            return {
              update,
              findOne,
              delete: deleteFn,
              load,
            };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const id = 1;
      const attributes = {
        name: 'api-token_tests-updated-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      } as any;

      const res = await apiTokenUpdate(id, attributes);
      // ensure any existing permissions have been deleted
      expect(deleteFn).toHaveBeenCalledWith({
        where: {
          token: id,
        },
      });
      expect(update).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id },
        data: attributes,
      });
      expect(res).toEqual(attributes);
    });

    test('Updates permissions field of a custom token with unknown permissions', async () => {
      const id = 1;

      const originalToken = {
        id,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['valid-permission-A'],
      };

      const updatedAttributes = {
        permissions: ['valid-permission-A', 'unknown-permission'],
      } as any;

      const findOne = jest.fn().mockResolvedValue(omit('permissions', originalToken));
      const update = jest.fn(({ data }) => Promise.resolve(data));
      const deleteFn = jest.fn();
      const create = jest.fn();
      const load = jest.fn();

      global.strapi = {
        ...getActionProvider(['valid-permission-A'] as any),
        db: {
          query() {
            return {
              update,
              findOne,
              delete: deleteFn,
              create,
              load,
            };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      expect(() => apiTokenUpdate(id, updatedAttributes)).rejects.toThrowError(
        new errors.ApplicationError(`Unknown permissions provided: unknown-permission`)
      );

      expect(update).not.toHaveBeenCalled();
      expect(deleteFn).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(load).not.toHaveBeenCalled();
    });

    test('Updates a non-permissions field of a custom token', async () => {
      const id = 1;

      const originalToken = {
        id,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['admin::subject.keepThisAction', 'admin::subject.oldAction'],
      };

      const updatedAttributes = {
        name: 'api-token_tests-updated-name',
        type: 'custom',
      } as any;

      const update = jest.fn(({ data }) => Promise.resolve(data));
      const findOne = jest.fn().mockResolvedValue(omit('permissions', originalToken));
      const deleteFn = jest.fn();
      const create = jest.fn();
      const load = jest
        .fn()
        // load permissions for result (legacy path loads permissions once)
        .mockResolvedValueOnce(
          Promise.resolve(
            originalToken.permissions.map((p) => {
              return {
                action: p,
              };
            })
          )
        );

      global.strapi = {
        db: {
          query() {
            return {
              update,
              findOne,
              delete: deleteFn,
              create,
              load,
            };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenUpdate(id, updatedAttributes);

      expect(update).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id },
        data: omit(['permissions'], updatedAttributes),
      });

      expect(res).toEqual({
        permissions: originalToken.permissions,
        ...updatedAttributes,
      });
    });

    test('Updates a custom token', async () => {
      const id = 1;

      const originalToken = {
        id,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['admin::subject.keepThisAction', 'admin::subject.oldAction'],
      };

      const updatedAttributes = {
        name: 'api-token_tests-updated-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: [
          // It should not recreate this action
          'admin::subject.keepThisAction',
          'admin::subject.newAction',
          // It should ignore the duplicate and not call create on the second occurence
          'admin::subject.newAction',
          'admin::subject.otherAction',
        ],
      } as any;

      const update = jest.fn(({ data }) => Promise.resolve(data));
      const findOne = jest.fn().mockResolvedValue(omit('permissions', originalToken));
      const deleteFn = jest.fn();
      const create = jest.fn();
      const load = jest
        .fn()
        // first call to load original permissions
        .mockResolvedValueOnce(
          Promise.resolve(
            originalToken.permissions.map((p) => {
              return {
                action: p,
              };
            })
          )
        )
        // second call to check new permissions
        .mockResolvedValueOnce(
          Promise.resolve(
            updatedAttributes.permissions.map((p: any) => {
              return {
                action: p,
              };
            })
          )
        );

      global.strapi = {
        ...getActionProvider([
          'admin::subject.keepThisAction',
          'admin::subject.newAction',
          'admin::subject.newAction',
          'admin::subject.otherAction',
        ] as any),
        db: {
          query() {
            return {
              update,
              findOne,
              delete: deleteFn,
              create,
              load,
            };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenUpdate(id, updatedAttributes);

      expect(deleteFn).toHaveBeenCalledTimes(1);
      // expect(deleteFn).toHaveBeenCalledWith({
      //   where: {
      //     action: { $in: ['admin::subject.oldAction'] },
      //     token: id,
      //   },
      // });
      expect(deleteFn).toHaveBeenCalledWith({
        where: {
          action: 'admin::subject.oldAction',
          token: id,
        },
      });

      expect(create).toHaveBeenCalledTimes(2);
      expect(create).not.toHaveBeenCalledWith({
        data: {
          action: 'admin::subject.keepAction',
          token: id,
        },
      });
      expect(create).toHaveBeenCalledWith({
        data: {
          action: 'admin::subject.newAction',
          token: id,
        },
      });
      expect(create).toHaveBeenCalledWith({
        data: {
          action: 'admin::subject.otherAction',
          token: id,
        },
      });

      expect(update).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id },
        data: omit(['permissions'], updatedAttributes),
      });

      expect(res).toEqual(updatedAttributes);
    });

    test('Throws when trying to change kind on update', async () => {
      const originalToken = {
        id: 1,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const findOne = jest.fn().mockResolvedValue(originalToken);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
        config: { get: jest.fn(() => '') },
      } as any;

      await expect(
        apiTokenUpdate(1, { kind: 'admin', name: 'api-token_tests-name' } as any)
      ).rejects.toThrow('kind is immutable after creation');
    });

    test('Throws when setting admin fields on a content API token update', async () => {
      const originalToken = {
        id: 1,
        kind: 'content-api',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const findOne = jest.fn().mockResolvedValue(originalToken);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
        config: { get: jest.fn(() => '') },
      } as any;

      await expect(
        apiTokenUpdate(1, { adminPermissions: [{ action: 'some.action' }] } as any)
      ).rejects.toThrow('Legacy tokens cannot carry admin permissions');
    });

    test('Throws when setting content API fields on an admin token update', async () => {
      const originalToken = {
        id: 1,
        kind: 'admin',
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        adminUserOwner: 1,
      };

      const findOne = jest.fn().mockResolvedValue(originalToken);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
        config: { get: jest.fn(() => '') },
      } as any;

      await expect(
        apiTokenUpdate(1, { type: 'read-only', name: 'api-token_tests-name' } as any)
      ).rejects.toThrow('Admin tokens cannot carry a legacy type');
    });

    test('Enforces owner ceiling when updating admin token permissions', async () => {
      const ownerUser = { id: 42, roles: [{ code: 'strapi-editor' }] };

      const originalToken = {
        id: 1,
        kind: 'admin',
        name: 'api-token_tests-name',
        description: '',
        adminUserOwner: ownerUser,
      };

      // Owner only has read permission on articles
      const ownerPermissions = [
        {
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::article.article',
          conditions: [],
          properties: {},
        },
      ];

      // Super admin requests a permission the owner does NOT have
      const requestedPermissions = [
        { action: 'plugin::content-manager.explorer.delete', subject: 'api::article.article' },
      ];

      const dbFindOne = jest.fn().mockResolvedValue(originalToken);

      const validActions = [
        'plugin::content-manager.explorer.read',
        'plugin::content-manager.explorer.delete',
      ];
      global.strapi = {
        db: {
          query() {
            return { findOne: dbFindOne };
          },
        },
        config: { get: jest.fn(() => '') },
        admin: {
          services: {
            user: { findOne: jest.fn().mockResolvedValue(ownerUser) },
            permission: {
              findUserPermissions: jest.fn().mockResolvedValue(ownerPermissions),
              actionProvider: {
                keys: jest.fn().mockReturnValue(validActions),
                values: jest
                  .fn()
                  .mockReturnValue(validActions.map((action) => ({ actionId: action }))),
              },
              findMany: jest.fn().mockResolvedValue([]),
            },
          },
        },
      } as any;

      await expect(
        apiTokenUpdate(1, { adminPermissions: requestedPermissions } as any)
      ).rejects.toThrow('Cannot assign admin permissions that exceed your own');
    });

    test('Throws when owner no longer exists during admin token permission update', async () => {
      const originalToken = {
        id: 1,
        kind: 'admin',
        name: 'api-token_tests-name',
        description: '',
        adminUserOwner: { id: 42 },
      };

      const dbFindOne = jest.fn().mockResolvedValue(originalToken);

      global.strapi = {
        db: {
          query() {
            return { findOne: dbFindOne };
          },
        },
        config: { get: jest.fn(() => '') },
        admin: {
          services: {
            user: { findOne: jest.fn().mockResolvedValue(null) },
            permission: {
              actionProvider: {
                keys: jest.fn().mockReturnValue(['some.action']),
                values: jest.fn().mockReturnValue([{ actionId: 'some.action' }]),
              },
            },
          },
        },
      } as any;

      await expect(
        apiTokenUpdate(1, { adminPermissions: [{ action: 'some.action', subject: null }] } as any)
      ).rejects.toThrow('Token owner no longer exists');
    });
  });

  describe('getByName', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('It retrieves the token', async () => {
      const findOne = jest.fn().mockResolvedValue(token);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await getByName(token.name);

      expect(findOne).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { name: token.name },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      // getBy normalizes: adds kind (default content-api for legacy tokens when missing from DB)
      expect(res).toEqual({ ...token, kind: 'content-api', permissions: [] });
    });

    test('It returns `null` if the resource does not exist', async () => {
      const findOne = jest.fn().mockResolvedValue(null);

      global.strapi = {
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await getByName('unexistant-name');

      expect(findOne).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { name: 'unexistant-name' },
        populate: ['permissions', 'adminPermissions', 'adminUserOwner'],
      });
      expect(res).toEqual(null);
    });
  });

  describe('getBy - includeDecryptedKey option', () => {
    const setupWithEncryption = () => {
      // Use the outer ENCRYPTION_KEY so encrypt/decrypt use the same key
      setupStrapiMock({
        db: {
          query() {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 1,
                name: 'test-token',
                type: 'read-only',
                encryptedKey: encryptionService.encrypt('plaintext-key'),
              }),
            };
          },
        },
      });
    };

    test('By default does NOT select encryptedKey and does NOT return accessKey', async () => {
      const findOne = jest.fn().mockResolvedValue({
        id: 1,
        name: 'test-token',
        type: 'read-only',
      });

      setupStrapiMock({
        db: {
          query() {
            return { findOne };
          },
        },
      });

      const res = await getById(1);

      // encryptedKey must not be in the select list
      const callArgs = findOne.mock.calls[0][0];
      expect(callArgs.select).not.toContain('encryptedKey');
      expect(res?.accessKey).toBeUndefined();
    });

    test('With { includeDecryptedKey: true } selects encryptedKey and returns plaintext accessKey', async () => {
      setupWithEncryption();

      const res = await getById(1, { includeDecryptedKey: true });

      expect(res?.accessKey).toBe('plaintext-key');
    });

    test('With { includeDecryptedKey: true } and missing encryptedKey returns token without accessKey', async () => {
      setupStrapiMock({
        db: {
          query() {
            return {
              findOne: jest.fn().mockResolvedValue({
                id: 1,
                name: 'test-token',
                type: 'read-only',
                encryptedKey: null,
              }),
            };
          },
        },
      });

      const res = await getById(1, { includeDecryptedKey: true });

      expect(res?.accessKey).toBeUndefined();
    });
  });

  describe('reconcileTokenPermissionsToUserCeiling', () => {
    const makeUserPerm = (
      action: string,
      subject: string | null,
      conditions: string[] = [],
      fields?: string[]
    ) => ({
      action,
      subject,
      conditions,
      properties: fields !== undefined ? { fields } : {},
    });

    const makeTokenPerm = (
      id: number,
      action: string,
      subject: string | null,
      conditions: string[] = [],
      fields?: string[]
    ) => ({
      id,
      action,
      subject,
      conditions,
      properties: fields !== undefined ? { fields } : {},
    });

    test('Keeps permission unchanged when action+subject match and conditions are identical', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    test('Moves permission to toDelete when no matching user permission exists', () => {
      const userPerms = [makeUserPerm('plugin::cm.read', 'api::article.article')];
      const tokenPerms = [makeTokenPerm(1, 'plugin::cm.delete', 'api::article.article')];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(1);
      expect(toDelete[0].id).toBe(1);
      expect(toUpdate).toHaveLength(0);
    });

    test('Moves permission to toDelete when token fields exceed user allowed fields', () => {
      const userPerms = [makeUserPerm('plugin::cm.read', 'api::article.article', [], ['title'])];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [], ['title', 'body']),
      ];

      const { toDelete } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(1);
      expect(toDelete[0].id).toBe(1);
    });

    test('Keeps permission when token fields are a subset of user allowed fields', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', [], ['title', 'body']),
      ];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [], ['title']),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    test('Keeps permission when user has all-fields (no fields restriction)', () => {
      const userPerms = [makeUserPerm('plugin::cm.read', 'api::article.article')];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [], ['title', 'body']),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    test('Moves permission to toUpdate when conditions differ from user permission conditions', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];
      const tokenPerms = [makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [])];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0]).toEqual({ id: 1, conditions: ['admin::is-creator'] });
    });

    test('Re-clamps conditions to empty when user permission is unconditional', () => {
      const userPerms = [makeUserPerm('plugin::cm.read', 'api::article.article', [])];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0]).toEqual({ id: 1, conditions: [] });
    });

    test('Computes union of conditions across multiple matching user permissions', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::has-draft-state']),
      ];
      const tokenPerms = [makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [])];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0].conditions).toEqual(
        expect.arrayContaining(['admin::is-creator', 'admin::has-draft-state'])
      );
      expect(toUpdate[0].conditions).toHaveLength(2);
    });

    test('Keeps permission unchanged when conditions are the same set in different order', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', [
          'admin::has-draft-state',
          'admin::is-creator',
        ]),
      ];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [
          'admin::is-creator',
          'admin::has-draft-state',
        ]),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    test('Moves to toUpdate when token has a condition the user no longer has', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [
          'admin::is-creator',
          'admin::has-draft-state',
        ]),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0]).toEqual({ id: 1, conditions: ['admin::is-creator'] });
    });

    test('Deduplicates conditions when multiple user perms repeat the same condition', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];
      const tokenPerms = [makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [])];

      const { toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0].conditions).toEqual(['admin::is-creator']);
      expect(toUpdate[0].conditions).toHaveLength(1);
    });

    test('Treats undefined token conditions as empty array (no false toUpdate)', () => {
      const userPerms = [makeUserPerm('plugin::cm.read', 'api::article.article', [])];
      const tokenPerms = [
        {
          id: 1,
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: undefined,
          properties: {},
        },
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });

    test('One user perm unconditional among conditional ones forces conditions to empty', () => {
      const userPerms = [
        makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
        makeUserPerm('plugin::cm.read', 'api::article.article', []),
      ];
      const tokenPerms = [
        makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', ['admin::is-creator']),
      ];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(1);
      expect(toUpdate[0]).toEqual({ id: 1, conditions: [] });
    });

    describe('Role-merge condition semantics', () => {
      test('[isCreator] + [isOwner] = [isCreator, isOwner]: unions conditions from two roles', () => {
        const userPerms = [
          makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
          makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-owner']),
        ];
        const tokenPerms = [makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', [])];

        const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
          userPerms as any,
          tokenPerms as any
        );

        expect(toDelete).toHaveLength(0);
        expect(toUpdate).toHaveLength(1);
        expect(toUpdate[0].conditions).toEqual(
          expect.arrayContaining(['admin::is-creator', 'admin::is-owner'])
        );
        expect(toUpdate[0].conditions).toHaveLength(2);
      });

      test('[isCreator] + [] = []: one unconditional role clears all conditions', () => {
        const userPerms = [
          makeUserPerm('plugin::cm.read', 'api::article.article', ['admin::is-creator']),
          makeUserPerm('plugin::cm.read', 'api::article.article', []),
        ];
        const tokenPerms = [
          makeTokenPerm(1, 'plugin::cm.read', 'api::article.article', ['admin::is-creator']),
        ];

        const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
          userPerms as any,
          tokenPerms as any
        );

        expect(toDelete).toHaveLength(0);
        expect(toUpdate).toHaveLength(1);
        expect(toUpdate[0]).toEqual({ id: 1, conditions: [] });
      });
    });

    test('Treats null and undefined subject as equivalent', () => {
      const userPerms = [makeUserPerm('plugin::cm.settings', null)];
      const tokenPerms = [makeTokenPerm(1, 'plugin::cm.settings', undefined as any)];

      const { toDelete, toUpdate } = reconcileTokenPermissionsToUserCeiling(
        userPerms as any,
        tokenPerms as any
      );

      expect(toDelete).toHaveLength(0);
      expect(toUpdate).toHaveLength(0);
    });
  });

  describe('syncApiTokenPermissionsForUser', () => {
    const buildStrapi = ({
      user,
      userPermissions,
      tokens,
      dbQueryMocks = {},
    }: {
      user: object | null;
      userPermissions: object[];
      tokens: object[];
      dbQueryMocks?: Record<string, jest.Mock>;
    }) => {
      const updateMock = jest.fn().mockResolvedValue({});
      const deleteByIdsMock = jest.fn().mockResolvedValue({});

      global.strapi = {
        db: {
          query: jest.fn((model: string) => {
            if (model === 'admin::user') {
              return { findOne: jest.fn().mockResolvedValue(user) };
            }
            if (model === 'admin::api-token') {
              return { findMany: jest.fn().mockResolvedValue(tokens) };
            }
            if (model === 'admin::permission') {
              return { update: updateMock };
            }
            return dbQueryMocks[model] ?? {};
          }),
        },
        config: { get: jest.fn(() => '') },
        admin: {
          services: {
            permission: {
              findUserPermissions: jest.fn().mockResolvedValue(userPermissions),
              deleteByIds: deleteByIdsMock,
            },
          },
        },
      } as any;

      return { updateMock, deleteByIdsMock };
    };

    test('Skips sync when user does not exist', async () => {
      const { deleteByIdsMock } = buildStrapi({ user: null, userPermissions: [], tokens: [] });

      await syncApiTokenPermissionsForUser(99);

      expect(deleteByIdsMock).not.toHaveBeenCalled();
    });

    test('Skips sync for super-admin users', async () => {
      const superAdmin = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
      const { deleteByIdsMock } = buildStrapi({
        user: superAdmin,
        userPermissions: [],
        tokens: [],
      });

      await syncApiTokenPermissionsForUser(1);

      expect(deleteByIdsMock).not.toHaveBeenCalled();
    });

    test('Deletes token permissions that are no longer in the user scope', async () => {
      const user = { id: 1, roles: [{ code: 'strapi-editor' }] };
      const userPermissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: [],
          properties: {},
        },
      ];
      const tokens = [
        {
          id: 10,
          adminPermissions: [
            {
              id: 101,
              action: 'plugin::cm.read',
              subject: 'api::article.article',
              conditions: [],
              properties: {},
            },
            {
              id: 102,
              action: 'plugin::cm.delete',
              subject: 'api::article.article',
              conditions: [],
              properties: {},
            },
          ],
        },
      ];

      const { deleteByIdsMock, updateMock } = buildStrapi({ user, userPermissions, tokens });

      await syncApiTokenPermissionsForUser(1);

      expect(deleteByIdsMock).toHaveBeenCalledWith([102]);
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('Updates conditions on token permissions whose conditions have drifted', async () => {
      const user = { id: 1, roles: [{ code: 'strapi-editor' }] };
      const userPermissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: ['admin::is-creator'],
          properties: {},
        },
      ];
      const tokens = [
        {
          id: 10,
          adminPermissions: [
            {
              id: 101,
              action: 'plugin::cm.read',
              subject: 'api::article.article',
              conditions: [],
              properties: {},
            },
          ],
        },
      ];

      const { deleteByIdsMock, updateMock } = buildStrapi({ user, userPermissions, tokens });

      await syncApiTokenPermissionsForUser(1);

      expect(deleteByIdsMock).not.toHaveBeenCalled();
      expect(updateMock).toHaveBeenCalledWith({
        where: { id: 101 },
        data: { conditions: ['admin::is-creator'] },
      });
    });

    test('Does nothing when token permissions are already in sync', async () => {
      const user = { id: 1, roles: [{ code: 'strapi-editor' }] };
      const userPermissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: [],
          properties: {},
        },
      ];
      const tokens = [
        {
          id: 10,
          adminPermissions: [
            {
              id: 101,
              action: 'plugin::cm.read',
              subject: 'api::article.article',
              conditions: [],
              properties: {},
            },
          ],
        },
      ];

      const { deleteByIdsMock, updateMock } = buildStrapi({ user, userPermissions, tokens });

      await syncApiTokenPermissionsForUser(1);

      expect(deleteByIdsMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });

    test('Skips tokens with no adminPermissions', async () => {
      const user = { id: 1, roles: [{ code: 'strapi-editor' }] };
      const tokens = [{ id: 10, adminPermissions: [] }];

      const { deleteByIdsMock, updateMock } = buildStrapi({ user, userPermissions: [], tokens });

      await syncApiTokenPermissionsForUser(1);

      expect(deleteByIdsMock).not.toHaveBeenCalled();
      expect(updateMock).not.toHaveBeenCalled();
    });
  });

  describe('enforceAdminPermissionsCeiling — super-admin condition sanitization', () => {
    const superAdmin = { id: 1, roles: [{ code: 'strapi-super-admin' }] } as any;

    const makeStrapWithConditions = (knownConditions: string[]) => {
      global.strapi = {
        admin: {
          services: {
            permission: {
              conditionProvider: {
                has: (condition: string) => knownConditions.includes(condition),
              },
            },
          },
        },
      } as any;
    };

    test('Returns permissions unchanged when all conditions are registered', async () => {
      makeStrapWithConditions(['admin::is-creator']);

      const permissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: ['admin::is-creator'],
          properties: {},
        },
      ];

      const result = await enforceAdminPermissionsCeiling(superAdmin, permissions);

      expect(result).toHaveLength(1);
      expect(result[0].conditions).toEqual(['admin::is-creator']);
    });

    test('Strips unregistered conditions from super-admin permissions', async () => {
      makeStrapWithConditions(['admin::is-creator']);

      const permissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: ['admin::is-creator', 'plugin::unknown.bogus-condition'],
          properties: {},
        },
      ];

      const result = await enforceAdminPermissionsCeiling(superAdmin, permissions);

      expect(result).toHaveLength(1);
      expect(result[0].conditions).toEqual(['admin::is-creator']);
    });

    test('Strips all conditions when none are registered', async () => {
      makeStrapWithConditions([]);

      const permissions = [
        {
          action: 'plugin::cm.read',
          subject: 'api::article.article',
          conditions: ['plugin::unknown.bogus-condition'],
          properties: {},
        },
      ];

      const result = await enforceAdminPermissionsCeiling(superAdmin, permissions);

      expect(result).toHaveLength(1);
      expect(result[0].conditions).toEqual([]);
    });

    test('Returns empty array for empty input', async () => {
      makeStrapWithConditions([]);

      const result = await enforceAdminPermissionsCeiling(superAdmin, []);

      expect(result).toEqual([]);
    });
  });
});
