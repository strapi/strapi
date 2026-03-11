import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import constants from '../../services/constants';
import adminTokenController from '../admin-token';

describe('Admin Token Controller', () => {
  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------
  const ownerUser = { id: 42, roles: [{ code: 'strapi-editor' }] };
  const superAdmin = { id: 99, roles: [{ code: 'strapi-super-admin' }] };

  const baseAdminToken = {
    id: 1,
    kind: 'admin' as const,
    name: 'admin-token-name',
    description: 'admin-token-description',
    adminPermissions: [],
    adminUserOwner: ownerUser.id,
  };

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------
  describe('Create', () => {
    const createBody = {
      name: 'admin-token-name',
      description: 'admin-token-description',
      adminPermissions: [],
    };

    test('Creates successfully — hardcodes kind:admin', async () => {
      const create = jest.fn().mockResolvedValue({ ...baseAdminToken, accessKey: 'new-key' });
      const exists = jest.fn(() => false);
      const created = jest.fn();
      const ctx = createContext({ body: createBody }, { created, state: { user: ownerUser } });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists, create },
          },
        },
      } as any;

      await adminTokenController.create(ctx as any);

      expect(exists).toHaveBeenCalledWith({ name: createBody.name });
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'admin', name: createBody.name }),
        ownerUser
      );
      expect(created).toHaveBeenCalled();
    });

    test('Throws when name is already taken', async () => {
      const exists = jest.fn(() => true);
      const ctx = createContext({ body: createBody }, { state: { user: ownerUser } });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists },
          },
        },
      } as any;

      expect.assertions(2);

      try {
        await adminTokenController.create(ctx as any);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }
    });

    test('Creates with a valid lifespan', async () => {
      const lifespan = constants.API_TOKEN_LIFESPANS.DAYS_7;
      const bodyWithLifespan = { ...createBody, lifespan };
      const create = jest.fn().mockResolvedValue({ ...baseAdminToken, lifespan });
      const exists = jest.fn(() => false);
      const created = jest.fn();
      const ctx = createContext(
        { body: bodyWithLifespan },
        { created, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists, create },
          },
        },
      } as any;

      await adminTokenController.create(ctx as any);

      expect(create).toHaveBeenCalledWith(expect.objectContaining({ lifespan }), ownerUser);
      expect(created).toHaveBeenCalled();
    });

    test('Throw error on content-api fields: type', async () => {
      const ctx = createContext(
        {
          body: {
            ...createBody,
            type: 'read-only',
          },
        },
        { state: { user: ownerUser }, badRequest: jest.fn() }
      );

      await adminTokenController.create(ctx as any);

      expect(ctx.badRequest).toHaveBeenCalledWith('Type is not allowed for admin tokens');
    });
    test('Throw error on content-api fields: permissions', async () => {
      const ctx = createContext(
        {
          body: {
            ...createBody,
            permissions: ['api::article.article.find'],
          },
        },
        { state: { user: ownerUser }, badRequest: jest.fn() }
      );

      await adminTokenController.create(ctx as any);

      expect(ctx.badRequest).toHaveBeenCalledWith('Permissions are not allowed for admin tokens');
    });
  });

  // ---------------------------------------------------------------------------
  // List
  // ---------------------------------------------------------------------------
  describe('List', () => {
    test('Calls service with filter kind:admin', async () => {
      const list = jest.fn().mockResolvedValue([baseAdminToken]);
      const send = jest.fn();
      const ctx = createContext({}, { send, state: { user: superAdmin } });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { list },
          },
        },
      } as any;

      await adminTokenController.list(ctx as any);

      expect(list).toHaveBeenCalledWith(superAdmin);
      expect(send).toHaveBeenCalledWith({ data: [baseAdminToken] });
    });
  });

  // ---------------------------------------------------------------------------
  // Revoke
  // ---------------------------------------------------------------------------
  describe('Revoke', () => {
    test('Revokes successfully', async () => {
      const revoke = jest.fn().mockResolvedValue(baseAdminToken);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: baseAdminToken.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(revoke).toHaveBeenCalledWith(baseAdminToken.id);
      expect(deleted).toHaveBeenCalledWith({ data: baseAdminToken });
    });

    test('Does not error when token does not exist', async () => {
      const revoke = jest.fn().mockResolvedValue(null);
      const deleted = jest.fn();
      const ctx = createContext({ params: { id: baseAdminToken.id } }, { deleted });

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(revoke).toHaveBeenCalledWith(baseAdminToken.id);
      expect(deleted).toHaveBeenCalledWith({ data: null });
    });
  });

  // ---------------------------------------------------------------------------
  // Regenerate — owner-only, super-admin does NOT bypass
  // ---------------------------------------------------------------------------
  describe('Regenerate', () => {
    test('Owner regenerates successfully', async () => {
      const tokenWithKey = { ...baseAdminToken, accessKey: 'new-key' };
      const regenerate = jest.fn().mockResolvedValue(tokenWithKey);
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const created = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { created, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { regenerate, getById },
          },
        },
      } as any;

      await adminTokenController.regenerate(ctx as any);

      expect(getById).toHaveBeenCalledWith(baseAdminToken.id);
      expect(regenerate).toHaveBeenCalledWith(baseAdminToken.id);
      expect(created).toHaveBeenCalled();
    });

    test('Forbids regenerate when caller is not the owner', async () => {
      const otherUser = { id: 55, roles: [{ code: 'strapi-editor' }] };
      const regenerate = jest.fn();
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const forbidden = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { forbidden, state: { user: otherUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { regenerate, getById },
          },
        },
      } as any;

      await adminTokenController.regenerate(ctx as any);

      expect(forbidden).toHaveBeenCalled();
      expect(regenerate).not.toHaveBeenCalled();
    });

    test('Super-admin does NOT bypass owner restriction', async () => {
      const regenerate = jest.fn();
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const forbidden = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { forbidden, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { regenerate, getById },
          },
        },
      } as any;

      await adminTokenController.regenerate(ctx as any);

      expect(forbidden).toHaveBeenCalled();
      expect(regenerate).not.toHaveBeenCalled();
    });

    test('Returns 404 when token not found', async () => {
      const regenerate = jest.fn();
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { regenerate, getById },
          },
        },
      } as any;

      await adminTokenController.regenerate(ctx as any);

      expect(notFound).toHaveBeenCalledWith('API Token not found');
      expect(regenerate).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Get — key exposed only to owner
  // ---------------------------------------------------------------------------
  describe('Get', () => {
    test('Owner gets token with accessKey (2 getById calls)', async () => {
      const tokenWithKey = { ...baseAdminToken, accessKey: 'plaintext-key' };
      const getById = jest
        .fn()
        .mockResolvedValueOnce(baseAdminToken)
        .mockResolvedValueOnce(tokenWithKey);
      const send = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { send, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.get(ctx as any);

      expect(getById).toHaveBeenCalledTimes(2);
      expect(send).toHaveBeenCalledWith({ data: tokenWithKey });
    });

    test('Super-admin gets token without accessKey (1 getById call)', async () => {
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const send = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { send, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.get(ctx as any);

      expect(getById).toHaveBeenCalledTimes(1);
      const sentData = send.mock.calls[0][0].data;
      expect(sentData.accessKey).toBeUndefined();
    });

    test('Returns 404 when token not found', async () => {
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.get(ctx as any);

      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });
  });

  // ---------------------------------------------------------------------------
  // Update — owner or super-admin
  // ---------------------------------------------------------------------------
  describe('Update', () => {
    const updateBody = {
      name: 'admin-token-name',
      description: 'updated-description',
    };
    const id = baseAdminToken.id;

    test('Owner updates successfully', async () => {
      const update = jest.fn().mockResolvedValue({ ...baseAdminToken, ...updateBody });
      const getById = jest.fn(() => baseAdminToken);
      const getByName = jest.fn(() => null);
      const send = jest.fn();
      const ctx = createContext(
        { body: updateBody, params: { id } },
        { send, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById, getByName, update },
          },
        },
      } as any;

      await adminTokenController.update(ctx as any);

      expect(update).toHaveBeenCalledWith(id, updateBody);
      expect(send).toHaveBeenCalled();
    });

    test('Super-admin updates successfully', async () => {
      const update = jest.fn().mockResolvedValue({ ...baseAdminToken, ...updateBody });
      const getById = jest.fn(() => baseAdminToken);
      const getByName = jest.fn(() => null);
      const send = jest.fn();
      const ctx = createContext(
        { body: updateBody, params: { id } },
        { send, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById, getByName, update },
          },
        },
      } as any;

      await adminTokenController.update(ctx as any);

      expect(update).toHaveBeenCalledWith(id, updateBody);
      expect(send).toHaveBeenCalled();
    });

    test('Forbids update when caller is not owner and not super-admin', async () => {
      const otherUser = { id: 77, roles: [{ code: 'strapi-editor' }] };
      const update = jest.fn();
      const forbidden = jest.fn();
      const getById = jest.fn(() => baseAdminToken);
      const getByName = jest.fn(() => null);
      const ctx = createContext(
        { body: updateBody, params: { id } },
        { forbidden, state: { user: otherUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById, getByName, update },
          },
        },
      } as any;

      await adminTokenController.update(ctx as any);

      expect(forbidden).toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();
    });

    test('Returns 404 when token not found', async () => {
      const getById = jest.fn(() => null);
      const notFound = jest.fn();
      const ctx = createContext(
        { body: updateBody, params: { id } },
        { notFound, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.update(ctx as any);

      expect(notFound).toHaveBeenCalledWith('API Token not found');
    });

    test('Throws when name is already taken by another token', async () => {
      const getById = jest.fn(() => baseAdminToken);
      const getByName = jest.fn(() => ({ id: 999, name: updateBody.name }));
      const ctx = createContext(
        { body: updateBody, params: { id } },
        { state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById, getByName },
          },
        },
      } as any;

      expect.assertions(2);

      try {
        await adminTokenController.update(ctx as any);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('Name already taken');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getOwnerPermissions — effective permissions of the token owner
  // ---------------------------------------------------------------------------
  describe('getOwnerPermissions', () => {
    const ownerPermissions = [
      { action: 'plugin::content-manager.explorer.read', subject: 'api::article.article' },
    ];

    test('Returns 404 when token not found', async () => {
      const getById = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.getOwnerPermissions(ctx as any);

      expect(notFound).toHaveBeenCalledWith('apiToken.notFound');
    });

    test('Returns 403 when caller is not owner and not super-admin', async () => {
      const otherUser = { id: 77, roles: [{ code: 'strapi-editor' }] };
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const forbidden = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { forbidden, state: { user: otherUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.getOwnerPermissions(ctx as any);

      expect(forbidden).toHaveBeenCalled();
    });

    test('Returns 404 when owner user no longer exists', async () => {
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const findOne = jest.fn().mockResolvedValue(null);
      const notFound = jest.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
            user: { findOne },
          },
        },
      } as any;

      await adminTokenController.getOwnerPermissions(ctx as any);

      expect(findOne).toHaveBeenCalledWith(String(ownerUser.id));
      expect(notFound).toHaveBeenCalledWith('owner.notFound');
    });

    test('Returns owner permissions when called by the token owner', async () => {
      const sanitizePermission = jest.fn((p) => p);
      const findUserPermissions = jest.fn().mockResolvedValue(ownerPermissions);
      const findOne = jest.fn().mockResolvedValue(ownerUser);
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
            user: { findOne },
            permission: { findUserPermissions, sanitizePermission },
          },
        },
      } as any;

      await adminTokenController.getOwnerPermissions(ctx as any);

      expect(findOne).toHaveBeenCalledWith(String(ownerUser.id));
      expect(findUserPermissions).toHaveBeenCalledWith(ownerUser);
      expect((ctx as any).body).toEqual({ data: ownerPermissions });
    });

    test('Returns owner permissions when called by a super-admin', async () => {
      const sanitizePermission = jest.fn((p) => p);
      const findUserPermissions = jest.fn().mockResolvedValue(ownerPermissions);
      const findOne = jest.fn().mockResolvedValue(ownerUser);
      const getById = jest.fn().mockResolvedValue(baseAdminToken);
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
            user: { findOne },
            permission: { findUserPermissions, sanitizePermission },
          },
        },
      } as any;

      await adminTokenController.getOwnerPermissions(ctx as any);

      expect(findOne).toHaveBeenCalledWith(String(ownerUser.id));
      expect(findUserPermissions).toHaveBeenCalledWith(ownerUser);
      expect((ctx as any).body).toEqual({ data: ownerPermissions });
    });
  });
});
