'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const { omit } = require('lodash/fp');
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

    test('Create API Token with lifespan', async () => {
      const lifespan = 90 * 24 * 60 * 60 * 1000; // 90 days
      const createBody = {
        ...body,
        lifespan,
      };
      const tokenBody = {
        ...createBody,
        expiresAt: Date.now() + lifespan,
        permissions: undefined,
      };

      const create = jest.fn().mockResolvedValue(tokenBody);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { badRequest, created });

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

      expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(createBody);
      expect(created).toHaveBeenCalledWith({ data: tokenBody });
    });

    test('Throws with invalid lifespan', async () => {
      const lifespan = -1;
      const createBody = {
        ...body,
        lifespan,
      };

      const create = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { created });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              create,
            },
          },
        },
      };

      expect(async () => {
        await apiTokenController.create(ctx);
      }).rejects.toThrow('lifespan must be greater than or equal to 1');
      expect(create).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
    });

    test('Ignores a received expiresAt', async () => {
      const lifespan = 90 * 24 * 60 * 60 * 1000; // 90 days
      const createBody = {
        ...body,
        expiresAt: 1234,
        lifespan,
      };
      const tokenBody = {
        ...createBody,
        expiresAt: Date.now() + lifespan,
        permissions: undefined,
      };

      const create = jest.fn().mockResolvedValue(tokenBody);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { badRequest, created });

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

      expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(omit(['expiresAt'], createBody));
      expect(created).toHaveBeenCalledWith({ data: tokenBody });
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

  describe('Regenerate an API token', () => {
    const token = {
      id: 1,
      name: 'api-token_tests-regenerate',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    test('Regenerates an API token successfully', async () => {
      const regenerate = jest.fn().mockResolvedValue(token);
      const getById = jest.fn().mockResolvedValue(token);
      const created = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { created });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              regenerate,
              getById,
            },
          },
        },
      };

      await apiTokenController.regenerate(ctx);

      expect(regenerate).toHaveBeenCalledWith(token.id);
    });

    test('Fails if token not found', async () => {
      const regenerate = jest.fn().mockResolvedValue(token);
      const getById = jest.fn().mockResolvedValue(null);
      const created = jest.fn();
      const notFound = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { created, notFound });

      global.strapi = {
        admin: {
          services: {
            'api-token': {
              regenerate,
              getById,
            },
          },
        },
      };

      await apiTokenController.regenerate(ctx);

      expect(regenerate).not.toHaveBeenCalled();
      expect(getById).toHaveBeenCalledWith(token.id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
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
