'use strict';

const { ApplicationError } = require('@strapi/utils').errors;
const { omit } = require('lodash/fp');
const createContext = require('../../../../../../../test/helpers/create-context');
const constants = require('../../../services/constants');
const transferTokenController = require('../../transfer/token');

describe('Transfer Token Controller', () => {
  describe('Create Transfer Token', () => {
    const body = {
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    test('Fails if transfer token already exists', async () => {
      const exists = jest.fn(() => true);
      const ctx = createContext({ body });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                exists,
              },
              permission: {
                providers: {
                  action: {
                    keys() {
                      return ['push'];
                    },
                  },
                },
              },
            },
          },
        },
      };

      expect.assertions(3);

      try {
        await transferTokenController.create(ctx);
      } catch (e) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }

      expect(exists).toHaveBeenCalledWith({ name: body.name });
    });

    test('Create Transfer Token Successfully', async () => {
      const create = jest.fn().mockResolvedValue(body);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body }, { badRequest, created });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                exists,
                create,
              },
            },
          },
        },
      };

      await transferTokenController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ name: body.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(body);
      expect(created).toHaveBeenCalled();
    });

    test('Create transfer token with valid lifespan', async () => {
      const lifespan = constants.TRANSFER_TOKEN_LIFESPANS.DAYS_7;
      const createBody = {
        ...body,
        lifespan,
      };
      const tokenBody = {
        ...createBody,
        expiresAt: Date.now() + lifespan,
      };

      const create = jest.fn().mockResolvedValue(tokenBody);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { badRequest, created });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                exists,
                create,
              },
            },
          },
        },
      };

      await transferTokenController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(createBody);
      expect(created).toHaveBeenCalledWith({ data: tokenBody });
    });

    test('Throws with invalid lifespan', async () => {
      const lifespan = 1235; // not in constants.TRANSFER_TOKEN_LIFESPANS
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
            transfer: {
              token: { create },
            },
          },
        },
      };

      expect(async () => {
        await transferTokenController.create(ctx);
      }).rejects.toThrow(/lifespan must be one of the following values/);
      expect(create).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
    });

    test('Throws with negative lifespan', async () => {
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
            transfer: {
              token: {
                create,
              },
            },
          },
        },
      };

      expect(async () => {
        await transferTokenController.create(ctx);
      }).rejects.toThrow(/lifespan must be one of the following values/);
      expect(create).not.toHaveBeenCalled();
      expect(created).not.toHaveBeenCalled();
    });

    test('Ignores a received expiresAt', async () => {
      const lifespan = constants.TRANSFER_TOKEN_LIFESPANS.DAYS_7;

      const createBody = {
        ...body,
        expiresAt: 1234,
        lifespan,
      };
      const tokenBody = {
        ...createBody,
        expiresAt: Date.now() + lifespan,
      };

      const create = jest.fn().mockResolvedValue(tokenBody);
      const exists = jest.fn(() => false);
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { badRequest, created });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                exists,
                create,
              },
            },
          },
        },
      };

      await transferTokenController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(omit(['expiresAt'], createBody));
      expect(created).toHaveBeenCalledWith({ data: tokenBody });
    });
  });

  describe('List transfer tokens', () => {
    const tokens = [
      {
        id: 1,
        name: 'transfer-token_tests-name',
        description: 'transfer-token_tests-description',
        permissions: ['push'],
      },
      {
        id: 2,
        name: 'transfer-token_tests-name-2',
        description: 'transfer-token_tests-description-2',
        permissions: ['push'],
      },
    ];

    test('List transfer tokens successfully', async () => {
      const list = jest.fn().mockResolvedValue(tokens);
      const ctx = createContext({});

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                list,
              },
            },
          },
        },
      };

      await transferTokenController.list(ctx);

      expect(list).toHaveBeenCalled();
      expect(ctx.body).toStrictEqual({ data: tokens });
    });
  });

  describe('Delete an transfer token', () => {
    const token = {
      id: 1,
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    test('Deletes an transfer token successfully', async () => {
      const revoke = jest.fn().mockResolvedValue(token);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                revoke,
              },
            },
          },
        },
      };

      await transferTokenController.revoke(ctx);

      expect(revoke).toHaveBeenCalledWith(token.id);
      expect(deleted).toHaveBeenCalledWith({ data: token });
    });

    test('Does not return an error if the resource does not exists', async () => {
      const revoke = jest.fn().mockResolvedValue(null);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                revoke,
              },
            },
          },
        },
      };

      await transferTokenController.revoke(ctx);

      expect(revoke).toHaveBeenCalledWith(token.id);
      expect(deleted).toHaveBeenCalledWith({ data: null });
    });
  });

  describe('Regenerate a transfer token', () => {
    const token = {
      id: 1,
      name: 'transfer-token_tests-regenerate',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    test('Regenerates a transfer token successfully', async () => {
      const regenerate = jest.fn().mockResolvedValue(token);
      const getById = jest.fn().mockResolvedValue(token);
      const created = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { created });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                regenerate,
                getById,
              },
            },
          },
        },
      };

      await transferTokenController.regenerate(ctx);

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
            transfer: {
              token: {
                regenerate,
                getById,
              },
            },
          },
        },
      };

      await transferTokenController.regenerate(ctx);

      expect(regenerate).not.toHaveBeenCalled();
      expect(getById).toHaveBeenCalledWith(token.id);
      expect(notFound).toHaveBeenCalledWith('Transfer token not found');
    });
  });

  describe('Retrieve a transfer token', () => {
    const token = {
      id: 1,
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    test('Retrieve a transfer token successfully', async () => {
      const getById = jest.fn().mockResolvedValue(token);
      const send = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { send });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                getById,
              },
            },
          },
        },
      };

      await transferTokenController.getById(ctx);

      expect(getById).toHaveBeenCalledWith(token.id);
      expect(ctx.body).toStrictEqual({ data: token });
    });

    test('Fails if the transfer token does not exist', async () => {
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext({ params: { id: token.id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                getById,
              },
            },
          },
        },
      };

      await transferTokenController.getById(ctx);

      expect(getById).toHaveBeenCalledWith(token.id);
      expect(notFound).toHaveBeenCalledWith('Transfer token not found');
    });
  });

  describe('Update a transfer Token', () => {
    const body = {
      name: 'transfer-token_tests-name',
      description: 'transfer-token_tests-description',
      permissions: ['push'],
    };

    const id = 1;

    test('Fails if the name is already taken', async () => {
      const getById = jest.fn(() => ({ id, ...body }));
      const getByName = jest.fn(() => ({ id: 2, name: body.name }));
      const ctx = createContext({ body, params: { id } });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                getById,
                getByName,
              },
            },
          },
        },
      };

      expect.assertions(3);

      try {
        await transferTokenController.update(ctx);
      } catch (e) {
        expect(e instanceof ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }

      expect(getByName).toHaveBeenCalledWith(body.name);
    });

    test('Fails if the token does not exist', async () => {
      const getById = jest.fn(() => null);
      const notFound = jest.fn();
      const getByName = jest.fn(() => ({ id: 1, name: body.name }));
      const ctx = createContext({ body, params: { id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                getById,
                getByName,
              },
            },
          },
        },
      };

      await transferTokenController.update(ctx);

      expect(getById).toHaveBeenCalledWith(id);
      expect(notFound).toHaveBeenCalledWith('Transfer token not found');
    });

    test('Updates transfer Token Successfully', async () => {
      const update = jest.fn().mockResolvedValue(body);
      const getById = jest.fn(() => ({ id, ...body }));
      const getByName = jest.fn(() => ({ id, name: body.name }));
      const notFound = jest.fn();
      const ctx = createContext({ body, params: { id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            transfer: {
              token: {
                getById,
                getByName,
                update,
              },
            },
          },
        },
      };

      await transferTokenController.update(ctx);

      expect(getById).toHaveBeenCalledWith(id);
      expect(notFound).not.toHaveBeenCalled();
      expect(update).toHaveBeenCalledWith(id, body);
    });
  });
});
