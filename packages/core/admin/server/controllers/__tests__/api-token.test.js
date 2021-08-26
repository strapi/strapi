'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
const apiTokenController = require('../api-token');

describe('API Token Controller', () => {
  describe('Create API Token', () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('Fails if API Token already exist', async () => {
      const exists = jest.fn(() => true);
      const badRequest = jest.fn();
      const ctx = createContext({ body }, { badRequest });

      global.strapi = {
        admin: {
          services: {
            ['api-token']: {
              exists,
            },
          },
        },
      };

      await apiTokenController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ name: body.name });
      expect(badRequest).toHaveBeenCalledWith('Name already taken');
    });

    test('Create API Token Successfully', async () => {
      const create = jest.fn().mockResolvedValue(body);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body }, { badRequest, created });

      global.strapi = {
        admin: {
          services: {
            ['api-token']: {
              exists,
              create,
            },
          },
        },
      };

      await apiTokenController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ name: body.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(body);
      expect(created).toHaveBeenCalled();
    });
  });
});
