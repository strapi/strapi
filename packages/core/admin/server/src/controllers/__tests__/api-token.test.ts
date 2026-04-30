import { errors } from '@strapi/utils';
import { omit } from 'lodash/fp';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import constants from '../../services/constants';
import apiTokenController from '../api-token';

describe('API Token Controller', () => {
  describe('Create API Token', () => {
    const contentApiBody = {
      kind: 'content-api',
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };
    const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };

    test('Fails if API Token already exists', async () => {
      const exists = jest.fn(() => true);
      const ctx = createContext({ body: contentApiBody });

      global.strapi = {
        contentAPI: {
          permissions: {
            providers: {
              action: {
                keys() {
                  return ['foo', 'bar'];
                },
              },
            },
          },
        },
        admin: {
          services: {
            'api-token-content-api': {
              exists,
            },
          },
        },
      } as any;

      expect.assertions(3);

      try {
        await apiTokenController.create(ctx as any);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }

      expect(exists).toHaveBeenCalledWith({ name: contentApiBody.name });
    });

    describe('Content API kind', () => {
      test('Create API Token Successfully', async () => {
        const create = jest.fn().mockResolvedValue(contentApiBody);
        const exists = jest.fn(() => false);
        const badRequest = jest.fn();
        const created = jest.fn();
        const ctx = createContext(
          { body: contentApiBody },
          { badRequest, created, state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                exists,
                create,
              },
            },
          },
        } as any;

        await apiTokenController.create(ctx as any);

        expect(exists).toHaveBeenCalledWith({ name: contentApiBody.name });
        expect(badRequest).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(contentApiBody, callingUser);
        expect(created).toHaveBeenCalled();
      });

      test('Create API Token with valid lifespan', async () => {
        const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_7;
        const createBody = {
          ...contentApiBody,
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
        const ctx = createContext(
          { body: createBody },
          { badRequest, created, state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                exists,
                create,
              },
            },
          },
        } as any;

        await apiTokenController.create(ctx as any);

        expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
        expect(badRequest).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(createBody, callingUser);
        expect(created).toHaveBeenCalledWith({ data: tokenBody });
      });

      test('Throws with invalid lifespan', async () => {
        const lifespan = 1235; // not in constants.API_TOKEN_LIFESPANS
        const createBody = {
          ...contentApiBody,
          lifespan,
        };

        const create = jest.fn();
        const created = jest.fn();
        const ctx = createContext({ body: createBody }, { created });

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                create,
              },
            },
          },
        } as any;

        await expect(apiTokenController.create(ctx as any)).rejects.toThrow(
          /lifespan must be one of the following values/
        );
        expect(create).not.toHaveBeenCalled();
        expect(created).not.toHaveBeenCalled();
      });

      test('Throws with negative lifespan', async () => {
        const lifespan = -1;
        const createBody = {
          ...contentApiBody,
          lifespan,
        };

        const create = jest.fn();
        const created = jest.fn();
        const ctx = createContext({ body: createBody }, { created });

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                create,
              },
            },
          },
        } as any;

        await expect(apiTokenController.create(ctx as any)).rejects.toThrow(
          /lifespan must be one of the following values/
        );
        expect(create).not.toHaveBeenCalled();
        expect(created).not.toHaveBeenCalled();
      });

      test('Ignores a received expiresAt', async () => {
        const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_7;

        const createBody = {
          ...contentApiBody,
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
        const ctx = createContext(
          { body: createBody },
          { badRequest, created, state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                exists,
                create,
              },
            },
          },
        } as any;

        await apiTokenController.create(ctx as any);

        expect(exists).toHaveBeenCalledWith({ name: tokenBody.name });
        expect(badRequest).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledWith(omit(['expiresAt'], createBody), callingUser);
        expect(created).toHaveBeenCalledWith({ data: tokenBody });
      });

      test('Does not forward admin fields for legacy kind', async () => {
        const createBody = {
          ...contentApiBody,
          adminUserOwner: 33,
        };
        const create = jest.fn().mockResolvedValue(contentApiBody);
        const exists = jest.fn(() => false);
        const created = jest.fn();
        const ctx = createContext({ body: createBody }, { created, state: { user: callingUser } });

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                exists,
                create,
              },
            },
          },
        } as any;

        await apiTokenController.create(ctx as any);

        expect(create).toHaveBeenCalledWith(
          {
            kind: 'content-api',
            name: createBody.name,
            description: createBody.description,
            type: createBody.type,
            permissions: undefined,
            lifespan: undefined,
          },
          callingUser
        );
      });
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
      const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
      const ctx = createContext({}, { send, state: { user: callingUser } });

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              list,
            },
          },
        },
      } as any;

      await apiTokenController.list(ctx as any);

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
            'api-token-content-api': {
              revoke,
            },
          },
        },
      } as any;

      await apiTokenController.revoke(ctx as any);

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
            'api-token-content-api': {
              revoke,
            },
          },
        },
      } as any;

      await apiTokenController.revoke(ctx as any);

      expect(revoke).toHaveBeenCalledWith(token.id);
      expect(deleted).toHaveBeenCalledWith({ data: null });
    });
  });

  describe('Regenerate an API token', () => {
    const legacyToken = {
      id: 1,
      kind: 'content-api',
      name: 'api-token_tests-regenerate',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const superAdmin = { id: 99, roles: [{ code: 'strapi-super-admin' }] };

    test('Regenerates an ownerless content API token successfully', async () => {
      const regenerate = jest.fn().mockResolvedValue(legacyToken);
      const getById = jest.fn().mockResolvedValue(legacyToken);
      const created = jest.fn();
      const ctx = createContext(
        { params: { id: legacyToken.id } },
        { created, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              regenerate,
              getById,
            },
          },
        },
      } as any;

      await apiTokenController.regenerate(ctx as any);

      expect(regenerate).toHaveBeenCalledWith(legacyToken.id);
    });

    test('Fails if token not found', async () => {
      const regenerate = jest.fn().mockResolvedValue(legacyToken);
      const getById = jest.fn().mockResolvedValue(null);
      const created = jest.fn();
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: legacyToken.id } },
        { created, notFound, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              regenerate,
              getById,
            },
          },
        },
      } as any;

      await apiTokenController.regenerate(ctx as any);

      expect(regenerate).not.toHaveBeenCalled();
      expect(getById).toHaveBeenCalledWith(legacyToken.id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });
  });

  describe('Retrieve an API token', () => {
    const legacyToken = {
      id: 1,
      kind: 'content-api',
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const superAdmin = { id: 99, roles: [{ code: 'strapi-super-admin' }] };

    test('Retrieve a content API token includes accessKey for any caller', async () => {
      const tokenWithKey = { ...legacyToken, accessKey: 'plaintext-key' };
      // first call (no key), second call (with key)
      const getById = jest
        .fn()
        .mockResolvedValueOnce(legacyToken)
        .mockResolvedValueOnce(tokenWithKey);
      const send = jest.fn();
      const ctx = createContext(
        { params: { id: legacyToken.id } },
        { send, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              getById,
            },
          },
        },
      } as any;

      await apiTokenController.get(ctx as any);

      expect(getById).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledWith({ data: tokenWithKey });
    });

    test('Fails if the API token does not exist', async () => {
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: legacyToken.id } },
        { notFound, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              getById,
            },
          },
        },
      } as any;

      await apiTokenController.get(ctx as any);

      expect(getById).toHaveBeenCalledWith(legacyToken.id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });
  });

  describe('Update API Token', () => {
    // legacyBody intentionally omits `kind` — apiTokenUpdateSchema rejects it as an unknown key
    const legacyBody = {
      name: 'api-token_tests-name',
      description: 'api-token_tests-description',
      type: 'read-only',
    };

    const id = 1;

    test('Fails if the token does not exist', async () => {
      const getById = jest.fn(() => null);
      const notFound = jest.fn();
      const ctx = createContext({ body: legacyBody, params: { id } }, { notFound });

      global.strapi = {
        admin: {
          services: {
            'api-token-content-api': {
              getById,
            },
          },
        },
      } as any;

      await apiTokenController.update(ctx as any);

      expect(getById).toHaveBeenCalledWith(id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });

    describe('Content API kind', () => {
      test('Fails if the name is already taken', async () => {
        const getById = jest.fn(() => ({ id, ...legacyBody }));
        const getByName = jest.fn(() => ({ id: 2, name: legacyBody.name }));
        const ctx = createContext({ body: legacyBody, params: { id } });

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                getById,
                getByName,
              },
            },
          },
        } as any;

        expect.assertions(3);

        try {
          await apiTokenController.update(ctx as any);
        } catch (e: any) {
          expect(e instanceof errors.ApplicationError).toBe(true);
          expect(e.message).toEqual('Name already taken');
        }

        expect(getByName).toHaveBeenCalledWith(legacyBody.name);
      });

      test('Updates API Token Successfully', async () => {
        const update = jest.fn().mockResolvedValue(legacyBody);
        const getById = jest.fn(() => ({ id, ...legacyBody }));
        const getByName = jest.fn(() => null);
        const notFound = jest.fn();
        const send = jest.fn();
        const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
        const ctx = createContext(
          { body: legacyBody, params: { id } },
          { notFound, send, state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                getById,
                getByName,
                update,
              },
            },
          },
        } as any;

        await apiTokenController.update(ctx as any);

        expect(getById).toHaveBeenCalledWith(id);
        expect(getByName).toHaveBeenCalledWith(legacyBody.name);
        expect(notFound).not.toHaveBeenCalled();
        expect(update).toHaveBeenCalledWith(id, legacyBody);
        expect(send).toHaveBeenCalled();
      });

      test('Rejects content API update when injecting adminUserOwner (Yup validation)', async () => {
        const invalidBody = {
          ...legacyBody,
          adminUserOwner: 2,
        };
        const update = jest.fn();
        const getById = jest.fn(() => ({ id, ...legacyBody }));
        const getByName = jest.fn(() => null);
        const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
        const ctx = createContext(
          { body: invalidBody, params: { id } },
          { state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                getById,
                getByName,
                update,
              },
            },
          },
        } as any;

        await expect(apiTokenController.update(ctx as any)).rejects.toThrow(
          /this field has unspecified keys: adminUserOwner/
        );
        expect(update).not.toHaveBeenCalled();
      });

      test('Rejects content API update when injecting adminPermissions (Yup validation)', async () => {
        const invalidBody = {
          ...legacyBody,
          adminPermissions: [],
        };
        const update = jest.fn();
        const getById = jest.fn(() => ({ id, ...legacyBody }));
        const getByName = jest.fn(() => null);
        const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
        const ctx = createContext(
          { body: invalidBody, params: { id } },
          { state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                getById,
                getByName,
                update,
              },
            },
          },
        } as any;

        await expect(apiTokenController.update(ctx as any)).rejects.toThrow(
          /this field has unspecified keys: adminPermissions/
        );
        expect(update).not.toHaveBeenCalled();
      });

      test('Rejects update when kind is injected (Yup validation — kind is unknown key)', async () => {
        const mutatedKindBody = {
          ...legacyBody,
          kind: 'admin',
        };
        const update = jest.fn();
        const getById = jest.fn(() => ({ id, ...legacyBody }));
        const getByName = jest.fn(() => null);
        const callingUser = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
        const ctx = createContext(
          { body: mutatedKindBody, params: { id } },
          { state: { user: callingUser } }
        );

        global.strapi = {
          admin: {
            services: {
              'api-token-content-api': {
                getById,
                getByName,
                update,
              },
            },
          },
        } as any;

        await expect(apiTokenController.update(ctx as any)).rejects.toThrow(
          /this field has unspecified keys: kind/
        );
        // Validation fires before service is reached
        expect(update).not.toHaveBeenCalled();
      });
    });
  });
});
