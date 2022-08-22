'use strict';

const crypto = require('crypto');
const { omit } = require('lodash/fp');
const apiTokenService = require('../api-token');

describe('API Token', () => {
  const mockedApiToken = {
    randomBytes: 'api-token_test-random-bytes',
    hexedString: '6170692d746f6b656e5f746573742d72616e646f6d2d6279746573',
  };

  const SELECT_FIELDS = [
    'id',
    'name',
    'description',
    'lastUsed',
    'type',
    'lifespan',
    'expiresAt',
    'createdAt',
    'updatedAt',
  ];

  beforeAll(() => {
    jest
      .spyOn(crypto, 'randomBytes')
      .mockImplementation(() => Buffer.from(mockedApiToken.randomBytes));
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('Creates a new token', async () => {
      const create = jest.fn(({ data }) => Promise.resolve(data));

      global.strapi = {
        query() {
          return { create };
        },
        config: {
          get: jest.fn(() => ''),
        },
      };

      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const res = await apiTokenService.create(attributes);

      expect(create).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        data: {
          ...attributes,
          accessKey: apiTokenService.hash(mockedApiToken.hexedString),
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
      };

      apiTokenService.checkSaltIsDefined();

      expect(mockedAppendFile).not.toHaveBeenCalled();
      expect(mockedConfigSet).not.toHaveBeenCalled();
    });

    test('It throws if the salt if the salt is not defined', () => {
      global.strapi = {
        config: {
          get: jest.fn(() => null),
        },
      };

      try {
        apiTokenService.checkSaltIsDefined();
      } catch (e) {
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
      };

      try {
        apiTokenService.createSaltIfNotDefined();
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
        query() {
          return { findMany };
        },
      };

      const res = await apiTokenService.list();

      expect(findMany).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
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
        query() {
          return { delete: mockedDelete };
        },
      };

      const res = await apiTokenService.revoke(token.id);

      expect(mockedDelete).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        where: { id: token.id },
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
    });

    test('It returns `null` if the resource does not exist', async () => {
      const mockedDelete = jest.fn().mockResolvedValue(null);

      global.strapi = {
        query() {
          return { delete: mockedDelete };
        },
      };

      const res = await apiTokenService.revoke(42);

      expect(mockedDelete).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
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
        query() {
          return { findOne };
        },
      };

      const res = await apiTokenService.getById(token.id);

      expect(findOne).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        where: { id: token.id },
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
    });

    test('It returns `null` if the resource does not exist', async () => {
      const findOne = jest.fn().mockResolvedValue(null);

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const res = await apiTokenService.getById(42);

      expect(findOne).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
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
        query() {
          return { update };
        },
        config: {
          get: jest.fn(() => ''),
        },
      };

      const id = 1;
      const res = await apiTokenService.regenerate(id);

      expect(update).toHaveBeenCalledWith({
        where: { id },
        select: ['id', 'accessKey'],
        data: {
          accessKey: apiTokenService.hash(mockedApiToken.hexedString),
        },
      });
      expect(res).toEqual({ accessKey: mockedApiToken.hexedString });
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
        query() {
          return {
            update,
            findOne,
            delete: deleteFn,
          };
        },
        config: {
          get: jest.fn(() => ''),
        },
        entityService: {
          load,
        },
      };

      const id = 1;
      const attributes = {
        name: 'api-token_tests-updated-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const res = await apiTokenService.update(id, attributes);
      // ensure any existing permissions have been deleted
      expect(deleteFn).toHaveBeenCalledWith({
        where: {
          token: id,
        },
      });
      expect(update).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        where: { id },
        data: attributes,
        populate: ['permissions'],
      });
      expect(res).toEqual(attributes);
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
        'admin::subject.keepThisAction',
        'admin::subject.newAction',
        'admin::subject.otherAction',
      ],
    };

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
          updatedAttributes.permissions.map((p) => {
            return {
              action: p,
            };
          })
        )
      );

    global.strapi = {
      query() {
        return {
          update,
          findOne,
          delete: deleteFn,
          create,
        };
      },
      config: {
        get: jest.fn(() => ''),
      },
      entityService: {
        load,
      },
    };

    const res = await apiTokenService.update(id, updatedAttributes);

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

    expect(create).toHaveBeenCalledTimes(3);
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
      select: SELECT_FIELDS,
      where: { id },
      data: omit(['permissions'], updatedAttributes),
      populate: expect.anything(), // it doesn't matter how this is used
    });

    expect(res).toEqual(updatedAttributes);
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
    };

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
      query() {
        return {
          update,
          findOne,
          delete: deleteFn,
          create,
        };
      },
      config: {
        get: jest.fn(() => ''),
      },
      entityService: {
        load,
      },
    };

    const res = await apiTokenService.update(id, updatedAttributes);

    expect(update).toHaveBeenCalledWith({
      select: SELECT_FIELDS,
      where: { id },
      data: omit(['permissions'], updatedAttributes),
      populate: expect.anything(), // it doesn't matter how this is used
    });

    expect(res).toEqual({
      permissions: originalToken.permissions,
      ...updatedAttributes,
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
        query() {
          return { findOne };
        },
      };

      const res = await apiTokenService.getByName(token.name);

      expect(findOne).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        where: { name: token.name },
        populate: ['permissions'],
      });
      expect(res).toEqual(token);
    });

    test('It returns `null` if the resource does not exist', async () => {
      const findOne = jest.fn().mockResolvedValue(null);

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const res = await apiTokenService.getByName('unexistant-name');

      expect(findOne).toHaveBeenCalledWith({
        select: SELECT_FIELDS,
        where: { name: 'unexistant-name' },
        populate: ['permissions'],
      });
      expect(res).toEqual(null);
    });
  });
});
