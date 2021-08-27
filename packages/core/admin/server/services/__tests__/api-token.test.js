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
      };

      const attributes = {
        name: 'api-token_tests-name',
        description: 'api-token_tests-description',
        type: 'read-only',
      };

      const res = await apiTokenService.create(attributes);

      expect(create).toHaveBeenCalledWith({
        select: ['id', 'name', 'description', 'type', 'accessKey'],
        data: {
          ...attributes,
          accessKey: mockedApiToken.hexedString,
        },
      });
      expect(res).toEqual({
        ...attributes,
        accessKey: mockedApiToken.hexedString,
      });
    });
  });
});
