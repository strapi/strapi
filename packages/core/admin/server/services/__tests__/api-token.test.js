'use strict';

const crypto = require('crypto');
const { omit } = require('lodash');
const apiTokenService = require('../api-token');

describe('API Token', () => {
  const mockedApiToken = {
    randomBytes: 'api-token_test-random-bytes',
    hexedString: '6170692d746f6b656e5f746573742d72616e646f6d2d6279746573',
  };

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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
        data: {
          ...attributes,
          accessKey: apiTokenService.hash(mockedApiToken.hexedString),
        },
        populate: ['permissions'],
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
        where: { id: 42 },
        populate: ['permissions'],
      });
      expect(res).toEqual(null);
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
      const findOne = jest.fn().mockResolvedValue(token);
      const load = jest.fn();

      global.strapi = {
        query() {
          return {
            update,
            findOne,
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
      expect(load).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith({
        select: ['id', 'name', 'description', 'type', 'createdAt'],
        where: { id },
        data: attributes,
        populate: ['permissions'],
      });
      expect(res).toEqual(attributes);
    });
  });

  test('Updates a custom token', async () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'custom',
      permissions: ['admin::subject.action'],
    };

    const update = jest.fn(({ data }) => Promise.resolve(data));
    const findOne = jest.fn().mockResolvedValue(token);
    const deleteMany = jest.fn();
    const createMany = jest.fn();
    const load = jest.fn();

    global.strapi = {
      query() {
        return {
          update,
          findOne,
          deleteMany,
          createMany,
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
      type: 'custom',
      permissions: ['admin::subject.newAction'],
    };

    const res = await apiTokenService.update(id, attributes);

    // TODO: test that deleteMany and createMany are called with the correct values

    // expect(deleteMany).toHaveBeenCalledWith({
    //   where: {
    //     action: ['admin::subject.action'],
    //   },
    // });

    // expect(createMany).toHaveBeenCalledWith({
    //   where: {
    //     action: ['admin::subject.Newaction'],
    //   },
    // });

    expect(load).toHaveBeenCalledWith(
      'admin::api-token',
      {
        description: 'api-token_tests-description',
        name: 'api-token_tests-updated-name',
        type: 'custom',
      },
      'permissions'
    );

    expect(update).toHaveBeenCalledWith({
      select: ['id', 'name', 'description', 'type', 'createdAt'],
      where: { id },
      data: omit(attributes, ['permissions']),
      populate: ['permissions'],
    });
    expect(res).toEqual(omit(attributes, ['permissions']));
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
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
        select: ['id', 'name', 'description', 'type', 'createdAt'],
        where: { name: 'unexistant-name' },
        populate: ['permissions'],
      });
      expect(res).toEqual(null);
    });
  });
});
