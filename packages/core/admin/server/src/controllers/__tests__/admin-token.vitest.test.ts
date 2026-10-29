import { describe, test, expect, vi } from 'vitest';
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
      const create = vi.fn().mockResolvedValue({ ...baseAdminToken, accessKey: 'new-key' });
      const exists = vi.fn(() => false);
      const created = vi.fn();
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
        ownerUser,
        undefined
      );
      expect(created).toHaveBeenCalled();
    });

    test('Passes the calling token permissions when the request is made with an admin token', async () => {
      const adminPermissions = [{ action: 'admin::admin-tokens.create', subject: null }];
      const create = vi.fn().mockResolvedValue({ ...baseAdminToken, accessKey: 'new-key' });
      const exists = vi.fn(() => false);
      const created = vi.fn();
      const ctx = createContext(
        { body: createBody },
        {
          created,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: 7, adminPermissions } },
          },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists, create },
          },
        },
      } as any;

      await adminTokenController.create(ctx as any);

      expect(create).toHaveBeenCalledWith(expect.anything(), ownerUser, adminPermissions);
    });

    test('Passes no permissions as an empty ceiling for a token without loaded permissions', async () => {
      const create = vi.fn().mockResolvedValue({ ...baseAdminToken, accessKey: 'new-key' });
      const exists = vi.fn(() => false);
      const created = vi.fn();
      const ctx = createContext(
        { body: createBody },
        {
          created,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: 7 } },
          },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists, create },
          },
        },
      } as any;

      await adminTokenController.create(ctx as any);

      expect(create).toHaveBeenCalledWith(expect.anything(), ownerUser, []);
    });

    test('Passes no calling token for an admin user session', async () => {
      const create = vi.fn().mockResolvedValue({ ...baseAdminToken, accessKey: 'new-key' });
      const exists = vi.fn(() => false);
      const created = vi.fn();
      const ctx = createContext(
        { body: createBody },
        {
          created,
          state: { user: ownerUser, auth: { strategy: { name: 'admin' }, credentials: ownerUser } },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { exists, create },
          },
        },
      } as any;

      await adminTokenController.create(ctx as any);

      expect(create).toHaveBeenCalledWith(expect.anything(), ownerUser, undefined);
    });

    test('Throws when name is already taken', async () => {
      const exists = vi.fn(() => true);
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
      const create = vi.fn().mockResolvedValue({ ...baseAdminToken, lifespan });
      const exists = vi.fn(() => false);
      const created = vi.fn();
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

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ lifespan }),
        ownerUser,
        undefined
      );
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
        { state: { user: ownerUser }, badRequest: vi.fn() }
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
        { state: { user: ownerUser }, badRequest: vi.fn() }
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
      const list = vi.fn().mockResolvedValue([baseAdminToken]);
      const send = vi.fn();
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
    test('Owner revokes successfully', async () => {
      const revoke = vi.fn().mockResolvedValue(baseAdminToken);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const deleted = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { deleted, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke, getById },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(getById).toHaveBeenCalledWith(baseAdminToken.id);
      expect(revoke).toHaveBeenCalledWith(baseAdminToken.id);
      expect(deleted).toHaveBeenCalledWith({ data: baseAdminToken });
    });

    test('Super-admin revokes successfully', async () => {
      const revoke = vi.fn().mockResolvedValue(baseAdminToken);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const deleted = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { deleted, state: { user: superAdmin } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke, getById },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(getById).toHaveBeenCalledWith(baseAdminToken.id);
      expect(revoke).toHaveBeenCalledWith(baseAdminToken.id);
      expect(deleted).toHaveBeenCalledWith({ data: baseAdminToken });
    });

    test('Forbids revoke when caller is not owner and not super-admin', async () => {
      const otherUser = { id: 77, roles: [{ code: 'strapi-editor' }] };
      const revoke = vi.fn();
      const forbidden = vi.fn();
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { forbidden, state: { user: otherUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke, getById },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(forbidden).toHaveBeenCalled();
      expect(revoke).not.toHaveBeenCalled();
    });

    test('Returns 404 when token not found', async () => {
      const revoke = vi.fn();
      const notFound = vi.fn();
      const getById = vi.fn().mockResolvedValue(null);
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, state: { user: ownerUser } }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { revoke, getById },
          },
        },
      } as any;

      await adminTokenController.revoke(ctx as any);

      expect(getById).toHaveBeenCalledWith(baseAdminToken.id);
      expect(notFound).toHaveBeenCalledWith('API Token not found');
      expect(revoke).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Regenerate — owner-only, super-admin does NOT bypass
  // ---------------------------------------------------------------------------
  describe('Regenerate', () => {
    test('Owner regenerates successfully', async () => {
      const tokenWithKey = { ...baseAdminToken, accessKey: 'new-key' };
      const regenerate = vi.fn().mockResolvedValue(tokenWithKey);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const created = vi.fn();
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
      const regenerate = vi.fn();
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const forbidden = vi.fn();
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

    test('Forbids regenerating a sibling token with an admin token of the same owner', async () => {
      const regenerate = vi.fn();
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const forbidden = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        {
          forbidden,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: 2 } },
          },
        }
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

    test('Regenerates the admin token the request is made with', async () => {
      const tokenWithKey = { ...baseAdminToken, accessKey: 'new-key' };
      const regenerate = vi.fn().mockResolvedValue(tokenWithKey);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const created = vi.fn();
      const ctx = createContext(
        { params: { id: String(baseAdminToken.id) } },
        {
          created,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: baseAdminToken.id } },
          },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { regenerate, getById },
          },
        },
      } as any;

      await adminTokenController.regenerate(ctx as any);

      expect(regenerate).toHaveBeenCalled();
      expect(created).toHaveBeenCalledWith({ data: tokenWithKey });
    });

    test('Super-admin does NOT bypass owner restriction', async () => {
      const regenerate = vi.fn();
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const forbidden = vi.fn();
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
      const regenerate = vi.fn();
      const getById = vi.fn().mockResolvedValue(null);
      const notFound = vi.fn();
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
      const getById = vi
        .fn()
        .mockResolvedValueOnce(baseAdminToken)
        .mockResolvedValueOnce(tokenWithKey);
      const send = vi.fn();
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

    test('Gets a sibling token without accessKey with an admin token of the same owner', async () => {
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const send = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        {
          send,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: 2 } },
          },
        }
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
      expect(send).toHaveBeenCalledWith({ data: baseAdminToken });
    });

    test('Gets the admin token the request is made with, with its accessKey', async () => {
      const tokenWithKey = { ...baseAdminToken, accessKey: 'plaintext-key' };
      const getById = vi
        .fn()
        .mockResolvedValueOnce(baseAdminToken)
        .mockResolvedValueOnce(tokenWithKey);
      const send = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        {
          send,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: baseAdminToken.id } },
          },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById },
          },
        },
      } as any;

      await adminTokenController.get(ctx as any);

      expect(send).toHaveBeenCalledWith({ data: tokenWithKey });
    });

    test('Super-admin gets token without accessKey (1 getById call)', async () => {
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const send = vi.fn();
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

    test('Returns 404 when caller is not owner and not super-admin', async () => {
      const otherUser = { id: 77, roles: [{ code: 'strapi-editor' }] };
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const notFound = vi.fn();
      const send = vi.fn();
      const ctx = createContext(
        { params: { id: baseAdminToken.id } },
        { notFound, send, state: { user: otherUser } }
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
      expect(send).not.toHaveBeenCalled();
      expect(getById).toHaveBeenCalledTimes(1);
    });

    test('Returns 404 when token not found', async () => {
      const getById = vi.fn().mockResolvedValue(null);
      const notFound = vi.fn();
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
      const update = vi.fn().mockResolvedValue({ ...baseAdminToken, ...updateBody });
      const getById = vi.fn(() => baseAdminToken);
      const getByName = vi.fn(() => null);
      const send = vi.fn();
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

      expect(update).toHaveBeenCalledWith(id, updateBody, undefined);
      expect(send).toHaveBeenCalled();
    });

    test('Super-admin updates successfully', async () => {
      const update = vi.fn().mockResolvedValue({ ...baseAdminToken, ...updateBody });
      const getById = vi.fn(() => baseAdminToken);
      const getByName = vi.fn(() => null);
      const send = vi.fn();
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

      expect(update).toHaveBeenCalledWith(id, updateBody, undefined);
      expect(send).toHaveBeenCalled();
    });

    test('Passes the calling token permissions when the request is made with an admin token', async () => {
      const adminPermissions = [{ action: 'admin::admin-tokens.update', subject: null }];
      const update = vi.fn().mockResolvedValue({ ...baseAdminToken, ...updateBody });
      const getById = vi.fn(() => baseAdminToken);
      const getByName = vi.fn(() => null);
      const send = vi.fn();
      const ctx = createContext(
        { body: updateBody, params: { id } },
        {
          send,
          state: {
            user: ownerUser,
            auth: { strategy: { name: 'admin-token' }, credentials: { id: 7, adminPermissions } },
          },
        }
      );

      global.strapi = {
        admin: {
          services: {
            'api-token-admin': { getById, getByName, update },
          },
        },
      } as any;

      await adminTokenController.update(ctx as any);

      expect(update).toHaveBeenCalledWith(id, updateBody, adminPermissions);
    });

    test('Forbids update when caller is not owner and not super-admin', async () => {
      const otherUser = { id: 77, roles: [{ code: 'strapi-editor' }] };
      const update = vi.fn();
      const forbidden = vi.fn();
      const getById = vi.fn(() => baseAdminToken);
      const getByName = vi.fn(() => null);
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
      const getById = vi.fn(() => null);
      const notFound = vi.fn();
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
      const getById = vi.fn(() => baseAdminToken);
      const getByName = vi.fn(() => ({ id: 999, name: updateBody.name }));
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
      const getById = vi.fn().mockResolvedValue(null);
      const notFound = vi.fn();
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
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const forbidden = vi.fn();
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
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
      const findOne = vi.fn().mockResolvedValue(null);
      const notFound = vi.fn();
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
      const sanitizePermission = vi.fn((p) => p);
      const findUserPermissions = vi.fn().mockResolvedValue(ownerPermissions);
      const findOne = vi.fn().mockResolvedValue(ownerUser);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
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
      const sanitizePermission = vi.fn((p) => p);
      const findUserPermissions = vi.fn().mockResolvedValue(ownerPermissions);
      const findOne = vi.fn().mockResolvedValue(ownerUser);
      const getById = vi.fn().mockResolvedValue(baseAdminToken);
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
