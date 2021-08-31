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

    test('Fails if API Token already exists', async () => {
      const exists = jest.fn(() => true);
      const badRequest = jest.fn();
      const ctx = createContext({ body }, { badRequest });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
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
            'api-token': {
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

  describe('List API tokens', () => {
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

    test('List API tokens successfully', async () => {
      const list = jest.fn().mockResolvedValue(tokens);
      const send = jest.fn();
      const ctx = createContext({}, { send });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              list,
            },
          },
        },
      };

      await apiTokenController.list(ctx);

      expect(list).toHaveBeenCalled();
      expect(send).toHaveBeenCalledWith({ data: tokens });
    });
  });

  describe('Delete an API token', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('Deletes an API token successfully', async () => {
      const revoke = jest.fn().mockResolvedValue(token);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              revoke,
            },
          },
        },
      };

      await apiTokenController.revoke(ctx);

      expect(revoke).toHaveBeenCalledWith(token.id);
      expect(deleted).toHaveBeenCalledWith();
    });

    test('Does not return an error if the ressource does not exists', async () => {
      const revoke = jest.fn().mockResolvedValue(null);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              revoke,
            },
          },
        },
      };

      await apiTokenController.revoke(ctx);

      expect(revoke).toHaveBeenCalledWith(token.id);
      expect(deleted).toHaveBeenCalledWith();
    });
  });
});
