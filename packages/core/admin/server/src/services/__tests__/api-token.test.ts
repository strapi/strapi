import crypto from 'crypto';
import { errors } from '@strapi/utils';
import { omit, uniq } from 'lodash/fp';
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
} from '../api-token';

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

      global.strapi = {
        db: {
          query() {
            return { create };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      } as any;

      const res = await apiTokenCreate(attributes);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...attributes,
          accessKey: hash(mockedApiToken.hexedString),
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a new token with lifespan', async () => {
      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        lifespan: constants.API_TOKEN_LIFESPANS.DAYS_90,
      } as any;

      const expectedExpires = Date.now() + attributes.lifespan;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      global.strapi = {
        db: {
          query() {
            return { create };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenCreate(attributes);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...attributes,
          accessKey: hash(mockedApiToken.hexedString),
          expiresAt: expectedExpires,
          lifespan: attributes.lifespan,
        },
        populate: ['permissions'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
        expiresAt: expectedExpires,
        lifespan: attributes.lifespan,
      });
      expect(res.expiresAt).toBe(expectedExpires);
    });

    test('It throws when creating a token with invalid lifespan', async () => {
      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
        lifespan: 12345,
      } as any;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      global.strapi = {
        db: {
          query() {
            return { create };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      expect(async () => {
        await apiTokenCreate(attributes);
      }).rejects.toThrow(/lifespan/);

      expect(create).not.toHaveBeenCalled();
    });

    test('Creates a custom token', async () => {
      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['admin::content.content.read'],
      } as any;

      const createTokenResult = {
        ...attributes,
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

      global.strapi = {
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
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenCreate(attributes);

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
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions'],
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
        ...createTokenResult,
        accessKey: mockedApiToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a custom token with no permissions', async () => {
      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: [],
      } as any;

      const createTokenResult = {
        ...attributes,
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

      global.strapi = {
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
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenCreate(attributes);

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
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions'],
      });

      expect(res).toEqual({
        ...createTokenResult,
        accessKey: mockedApiToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a custom token with duplicate permissions should ignore duplicates', async () => {
      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'custom',
        permissions: ['api::foo.foo.find', 'api::foo.foo.find', 'api::foo.foo.create'],
      } as any;

      const createTokenResult = {
        ...attributes,
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

      global.strapi = {
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
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await apiTokenCreate(attributes);

      expect(res.permissions).toHaveLength(2);
      expect(res.permissions).toEqual(['api::foo.foo.find', 'api::foo.foo.create']);
    });

    test('Creates a custom token with invalid permissions should throw', async () => {
      const attributes = {
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

      global.strapi = {
        ...getActionProvider(['valid-permission'] as any),
        db: {
          query() {
            return {
              create,
              load,
            };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      await expect(() => apiTokenCreate(attributes)).rejects.toThrowError(
        new errors.ApplicationError(
          `Unknown permissions provided: unknown-permission-A, unknown-permission-B`
        )
      );

      expect(load).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('checkSaltIsDefined', () => {
    test('It does nothing if the salt is already defined', () => {
      const mockedAppendFile = jest.fn();
      const mockedConfigSet = jest.fn();

      global.strapi = {
        config: {
          get: jest.fn(() => ({
            admin: { apiToken: { salt: 'api-token_tests-salt' } },
          })),
          set: mockedConfigSet,
        },
      } as any;

      checkSaltIsDefined();

      expect(mockedAppendFile).not.toHaveBeenCalled();
      expect(mockedConfigSet).not.toHaveBeenCalled();
    });

    test('It throws if the salt is not defined', () => {
      global.strapi = {
        config: {
          get: jest.fn(() => null),
        },
      } as any;

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

    test('It lists all the tokens', async () => {
      const findMany = jest.fn().mockResolvedValue(tokens);

      global.strapi = {
        db: {
          query() {
            return { findMany };
          },
        },
      } as any;

      const res = await list();

      expect(findMany).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        orderBy: { name: 'ASC' },
        populate: ['permissions'],
      });
      expect(res).toEqual(tokens);
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
      const mockedDelete = jest.fn().mockResolvedValue(token);

      global.strapi = {
        db: {
          query() {
            return { delete: mockedDelete };
          },
        },
      } as any;

      const res = await revoke(token.id);

      expect(mockedDelete).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: token.id },
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
    });

    test('It returns `null` if the resource does not exist', async () => {
      const mockedDelete = jest.fn().mockResolvedValue(null);

      global.strapi = {
        db: {
          query() {
            return { delete: mockedDelete };
          },
        },
      } as any;

      const res = await revoke(42);

      expect(mockedDelete).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id: 42 },
        populate: ['permissions'],
      });

      expect(res).toEqual(null);
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
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
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
        populate: ['permissions'],
      });
      expect(res).toEqual(null);
    });
  });

  describe('regenerate', () => {
    test('It regenerates the accessKey', async () => {
      const update = jest.fn(({ data }) => Promise.resolve(data));

      global.strapi = {
        db: {
          query() {
            return { update };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const id = 1;
      const res = await regenerate(id);

      expect(update).toHaveBeenCalledWith({
        where: { id },
        select: ['id', 'accessKey'],
        data: {
          accessKey: hash(mockedApiToken.hexedString),
        },
      });
      expect(res).toEqual({ accessKey: mockedApiToken.hexedString });
    });

    test('It throws a NotFound if the id is not found', async () => {
      const update = jest.fn(() => Promise.resolve(null));

      global.strapi = {
        db: {
          query() {
            return { update };
          },
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const id = 1;
      await expect(async () => {
        await regenerate(id);
      }).rejects.toThrowError(errors.NotFoundError);

      expect(update).toHaveBeenCalledWith({
        where: { id },
        select: ['id', 'accessKey'],
        data: {
          accessKey: hash(mockedApiToken.hexedString),
        },
      });
    });
  });

  describe('update', () => {
    test('Updates a non-custom token', async () => {
      const token = {
        id: 1,
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
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
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
        populate: ['permissions'],
      });
      expect(res).toEqual(null);
    });
  });
});
