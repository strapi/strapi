import crypto from 'crypto';
import { errors } from '@strapi/utils';
import { omit, uniq } from 'lodash/fp';
import {
  create as tokenServiceCreate,
  list,
  getById,
  getByName,
  update as tokenServiceUpdate,
  revoke,
  regenerate,
  hash,
  checkSaltIsDefined,
} from '../../transfer/token';
import constants from '../../constants';

const getActionProvider = (actions = []) => {
  return {
    admin: {
      services: {
        transfer: {
          utils: { hasValidTokenSalt: jest.fn(() => true) },
          permission: { providers: { action: { keys: jest.fn(() => actions) } } },
        },
      },
    },
  };
};

describe('Transfer Token', () => {
  const mockedTransferToken = {
    randomBytes: 'transfer-token_test-random-bytes',
    hexedString: '7472616e736665722d746f6b656e5f746573742d72616e646f6d2d6279746573',
  };

  let now: any;
  let nowSpy: any;

  beforeAll(() => {
    jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementation(() => Buffer.from(mockedTransferToken.randomBytes));

    // To eliminate latency in the request and predict the expiry timestamp, we freeze Date.now()
    now = Date.now();
    nowSpy = jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterAll(() => {
    nowSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('Creates a token', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
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
          attributes.permissions.map((p: any) => {
            return {
              action: p,
            };
          })
        )
      );

      global.strapi = {
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return {
              load,
              create,
            };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceCreate(attributes);

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
          accessKey: hash(mockedTransferToken.hexedString),
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions'],
      });
      // call to create permission
      expect(create).toHaveBeenNthCalledWith(2, {
        data: {
          action: 'push',
          token: {
            ...createTokenResult,
            expiresAt: null,
            lifespan: null,
          },
        },
      });

      expect(res).toEqual({
        ...createTokenResult,
        accessKey: mockedTransferToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a new token with lifespan', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        lifespan: constants.TRANSFER_TOKEN_LIFESPANS.DAYS_90,
        permissions: ['push' as const],
      };

      const expectedExpires = Date.now() + attributes.lifespan;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      const load = jest.fn().mockResolvedValueOnce(
        Promise.resolve(
          uniq(attributes.permissions).map((p) => {
            return {
              action: p,
            };
          })
        )
      );

      global.strapi = {
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return { load, create };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceCreate(attributes);

      expect(create).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        data: {
          ...attributes,
          accessKey: hash(mockedTransferToken.hexedString),
          expiresAt: expectedExpires,
          lifespan: attributes.lifespan,
        },
        populate: ['permissions'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedTransferToken.hexedString,
        expiresAt: expectedExpires,
        lifespan: attributes.lifespan,
      });
      expect(res.expiresAt).toBe(expectedExpires);
    });

    test('It throws when creating a token with invalid lifespan', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
        lifespan: 12345,
      } as any;

      const create = jest.fn(({ data }) => Promise.resolve(data));
      global.strapi = {
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return { create };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      expect(async () => {
        await tokenServiceCreate(attributes);
      }).rejects.toThrow(/lifespan/);

      expect(create).not.toHaveBeenCalled();
    });

    test('Creates a token with no permissions', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
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
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return {
              load,
              findOne,
              create,
            };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceCreate(attributes);

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
          accessKey: hash(mockedTransferToken.hexedString),
          expiresAt: null,
          lifespan: null,
        },
        populate: ['permissions'],
      });

      expect(res).toEqual({
        ...createTokenResult,
        accessKey: mockedTransferToken.hexedString,
        expiresAt: null,
        lifespan: null,
      });
    });

    test('Creates a token with duplicate permissions should ignore duplicates', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        type: 'custom',
        permissions: ['push', 'push', 'push'],
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
          uniq(attributes.permissions).map((p) => {
            return {
              action: p,
            };
          })
        )
      );

      global.strapi = {
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return {
              findOne,
              load,
              create,
            };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceCreate(attributes);

      expect(res.permissions).toHaveLength(1);
      expect(res.permissions).toEqual(['push']);
    });

    test('Creates a token with invalid permissions should throw', async () => {
      const attributes = {
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        type: 'custom',
        permissions: ['foo', 'bar'],
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
          uniq(attributes.permissions).map((p) => {
            return {
              action: p,
            };
          })
        )
      );

      global.strapi = {
        ...getActionProvider(['push'] as any),
        db: {
          query() {
            return {
              create,
              load,
            };
          },
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      await expect(() => tokenServiceCreate(attributes)).rejects.toThrowError(
        new errors.ApplicationError(`Unknown permissions provided: foo, bar`)
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
        admin: {
          services: {
            transfer: {
              utils: {
                hasValidTokenSalt: jest.fn(() => true),
              },
            },
          },
        },
        config: {
          get: jest.fn(() => ({
            admin: { transfer: { token: { salt: 'transfer-token_tests-salt' } } },
          })),
          set: mockedConfigSet,
        },
      } as any;

      checkSaltIsDefined();

      expect(mockedAppendFile).not.toHaveBeenCalled();
      expect(mockedConfigSet).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    const tokens = [
      {
        id: 1,
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: [{ action: 'push' }],
      },
      {
        id: 2,
        name: 'transfer-token_tests-name-2',
        description: 'transfer-token_tests-description-2',
        permissions: [{ action: 'push' }],
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

      expect(res).toEqual(
        tokens.map((token) => ({
          ...token,
          permissions: token.permissions.map(({ action }) => action),
        }))
      );
    });
  });

  describe('revoke', () => {
    const token = {
      id: 1,
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    test('It deletes the token', async () => {
      const mockedDelete = jest.fn().mockResolvedValue(token);

      global.strapi = {
        db: {
          query() {
            return { delete: mockedDelete };
          },
          transaction: jest.fn((cb) => cb()),
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
          transaction: jest.fn((cb) => cb()),
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
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: [{ action: 'push' }],
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

      expect(res).toEqual({
        ...token,
        permissions: token.permissions.map(({ action }) => action),
      });
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
        admin: {
          services: {
            transfer: {
              utils: {
                hasValidTokenSalt: jest.fn(() => true),
              },
            },
          },
        },
        db: {
          query() {
            return { update };
          },
          transaction: jest.fn((cb) => cb()),
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
          accessKey: hash(mockedTransferToken.hexedString),
        },
      });
      expect(res).toEqual({ accessKey: mockedTransferToken.hexedString });
    });

    test('It throws a NotFound if the id is not found', async () => {
      const update = jest.fn(() => Promise.resolve(null));

      global.strapi = {
        admin: {
          services: {
            transfer: {
              utils: {
                hasValidTokenSalt: jest.fn(() => true),
              },
            },
          },
        },
        db: {
          query() {
            return { update };
          },
          transaction: jest.fn((cb) => cb()),
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
          accessKey: hash(mockedTransferToken.hexedString),
        },
      });
    });
  });

  describe('update', () => {
    test('Updates a token', async () => {
      const id = 1;

      const originalToken = {
        id,
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
      };

      const updatedAttributes = {
        name: 'transfer-token_tests-updated-name',
        description: 'transfer-token_tests-description',
        permissions: [
          // It should ignore the duplicate and not call create
          'push',
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
        ...getActionProvider(['push'] as any),
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
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceUpdate(id, updatedAttributes);

      expect(deleteFn).not.toHaveBeenCalled();

      expect(update).toHaveBeenCalledWith({
        select: expect.arrayContaining([expect.any(String)]),
        where: { id },
        data: omit(['permissions'], updatedAttributes),
      });

      expect(res).toEqual(updatedAttributes);
    });

    test('Updates a non-permissions field of a token', async () => {
      const id = 1;

      const originalToken = {
        id,
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
      };

      const updatedAttributes = {
        name: 'transfer-token_tests-updated-name',
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
        ...getActionProvider(['push'] as any),
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
          transaction: jest.fn((cb) => cb()),
        },
        config: {
          get: jest.fn(() => ''),
        },
      } as any;

      const res = await tokenServiceUpdate(id, updatedAttributes);

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

    test('Updates permissions field of a token with unknown permissions', async () => {
      const id = 1;

      const originalToken = {
        id,
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
      };

      const updatedAttributes = {
        permissions: ['push', 'unknown-permission'],
      } as any;

      const findOne = jest.fn().mockResolvedValue(omit('permissions', originalToken));
      const update = jest.fn(({ data }) => Promise.resolve(data));
      const deleteFn = jest.fn();
      const create = jest.fn();
      const load = jest.fn();

      global.strapi = {
        ...getActionProvider(['push'] as any),
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

      expect(() => tokenServiceUpdate(id, updatedAttributes)).rejects.toThrowError(
        new errors.ApplicationError(`Unknown permissions provided: unknown-permission`)
      );

      expect(update).not.toHaveBeenCalled();
      expect(deleteFn).not.toHaveBeenCalled();
      expect(create).not.toHaveBeenCalled();
      expect(load).not.toHaveBeenCalled();
    });
  });

  describe('getByName', () => {
    const token = {
      id: 1,
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: [{ action: 'push' }],
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
      expect(res).toEqual({
        ...token,
        permissions: token.permissions.map(({ action }) => action),
      });
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
