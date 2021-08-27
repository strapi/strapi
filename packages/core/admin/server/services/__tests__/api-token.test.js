'use strict';

const crypto = require('crypto');
const apiTokenService = require('../api-token');

describe('API Token', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('Creates a new token', async () => {
      const create = jest.fn(({ data }) => Promise.resolve(data));

      const mockedApiToken = {
        randomBytes: 'api-token_test-random-bytes',
        hexedString: '6170692d746f6b656e5f746573742d72616e646f6d2d6279746573',
      };

      crypto.randomBytes = jest.fn(() => Buffer.from(mockedApiToken.randomBytes));

      global.strapi = {
        query() {
          return { create };
        },
        config: {
          get: jest.fn(() => ({})),
        },
      };

      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const res = await apiTokenService.create(attributes);

      expect(create).toHaveBeenCalledWith({
        select: ['id', 'name', 'description', 'type'],
        data: {
          ...attributes,
          accessKey: apiTokenService.hash(mockedApiToken.hexedString),
        },
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
      });
    });
  });

  describe('createSaltIfNotDefined', () => {
    test('It does nothing if the salt is alread defined', () => {
      const mockedAppendFile = jest.fn();
      const mockedConfigSet = jest.fn();

      global.strapi = {
        config: {
          get: jest.fn(() => ({
            server: {
              admin: { 'api-token': { salt: 'api-token_tests-salt' } },
            },
          })),
          set: mockedConfigSet,
        },
        fs: { appendFile: mockedAppendFile },
      };

      apiTokenService.createSaltIfNotDefined();

      expect(mockedAppendFile).not.toHaveBeenCalled();
      expect(mockedConfigSet).not.toHaveBeenCalled();
    });

    test('It creates a new salt, appendit to the .env file and sets it in the configuration', () => {
      const mockedAppendFile = jest.fn();
      const mockedConfigSet = jest.fn();

      global.strapi = {
        config: {
          get: jest.fn(() => null),
          set: mockedConfigSet,
        },
        fs: { appendFile: mockedAppendFile },
      };

      apiTokenService.createSaltIfNotDefined();

      expect(mockedAppendFile).toHaveBeenCalled();
      expect(mockedConfigSet).toHaveBeenCalled();
    });
  });
});
