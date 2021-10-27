'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
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
      const ctx = createContext({ body });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              exists,
            },
          },
        },
      };

      expect.assertions(3);

      try {
        await apiTokenController.create(ctx);
      } catch (e) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }

      expect(exists).toHaveBeenCalledWith({ name: body.name });
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
      expect(deleted).toHaveBeenCalledWith({ data: token });
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
      expect(deleted).toHaveBeenCalledWith({ data: null });
    });
  });

  describe('Retrieve an API token', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('Retrieve an API token successfully', async () => {
      const getById = jest.fn().mockResolvedValue(token);
      const send = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { send });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getById,
            },
          },
        },
      };

      await apiTokenController.get(ctx);

      expect(getById).toHaveBeenCalledWith(token.id);
      expect(send).toHaveBeenCalledWith({ data: token });
    });

    test('Fails if the API token does not exist', async () => {
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getById,
            },
          },
        },
      };

      await apiTokenController.get(ctx);

      expect(getById).toHaveBeenCalledWith(token.id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });
  });

  describe('Update API Token', () => {
    const body = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const id = 1;

    test('Fails if the name is already taken', async () => {
      const getById = jest.fn(() => ({ id, ...body }));
      const getByName = jest.fn(() => ({ id: 2, name: body.name }));
      const ctx = createContext({ body, params: { id } });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getById,
              getByName,
            },
          },
        },
      };

      expect.assertions(3);

      try {
        await apiTokenController.update(ctx);
      } catch (e) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }

      expect(getByName).toHaveBeenCalledWith(body.name);
    });

    test('Fails if the token does not exist', async () => {
      const getById = jest.fn(() => null);
      const notFound = jest.fn();
      const ctx = createContext({ body, params: { id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getById,
            },
          },
        },
      };

      await apiTokenController.update(ctx);

      expect(getById).toHaveBeenCalledWith(id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });

    test('Updates API Token Successfully', async () => {
      const update = jest.fn().mockResolvedValue(body);
      const getById = jest.fn(() => ({ id, ...body }));
      const getByName = jest.fn(() => null);
      const notFound = jest.fn();
      const send = jest.fn();
      const ctx = createContext({ body, params: { id } }, { notFound, send });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              getById,
              getByName,
              update,
            },
          },
        },
      };

      await apiTokenController.update(ctx);

      expect(getById).toHaveBeenCalledWith(id);
      expect(getByName).toHaveBeenCalledWith(body.name);
      expect(notFound).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(id, body);
      expect(send).toHaveBeenCalled();
    });
  });
});
