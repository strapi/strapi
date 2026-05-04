import _ from 'lodash';
import { merge } from 'lodash/fp';
import {
  cleanPermissionsInDatabase,
  findUserPermissions,
  sanitizePermission,
  findMany as permissionsServiceFindMany,
} from '../permission';
import { toPermission } from '../../domain/permission';

describe('Permission Service', () => {
  beforeEach(() => {
    global.strapi = {
      admin: {
        services: {
          condition: {
            isValidCondition() {
              return true;
            },
          },
        },
      },
    } as any;
  });

  describe('Find permissions', () => {
    test('Find calls the right db query', async () => {
      const findMany = jest.fn(() => Promise.resolve([]));
      global.strapi = merge(global.strapi, {
        db: {
          query() {
            return { findMany };
          },
        },
      });

      await permissionsServiceFindMany({ where: { role: { id: 1 } } });

      expect(findMany).toHaveBeenCalledWith({ where: { role: { id: 1 } } });
    });
  });

  describe('Find User Permissions', () => {
    test('Find calls the right db query', async () => {
      const findMany = jest.fn(() => Promise.resolve([]));

      global.strapi = merge(global.strapi, {
        db: {
          query() {
            return { findMany };
          },
        },
      });

      await findUserPermissions({
        id: 1,
      } as any);

      expect(findMany).toHaveBeenCalledWith({ where: { role: { users: { id: 1 } } } });
    });
  });

  describe('Sanitize Permission', () => {
    test('Removes unwanted properties', () => {
      const isValidCondition = jest.fn((condition) => ['cond'].includes(condition));

      global.strapi = merge(global.strapi, {
        admin: { services: { condition: { isValidCondition } } },
      });

      const permission = {
        action: 'read',
        subject: 'article',
        properties: { fields: ['*'] },
        conditions: ['cond'],
        foo: 'bar',
      } as any;

      const sanitizedPermission: any = sanitizePermission(permission);

      expect(sanitizedPermission.foo).toBeUndefined();
      expect(sanitizedPermission).toMatchObject({
        ..._.omit(permission, 'foo'),
      });
    });
  });

  describe('cleanPermissionsInDatabase', () => {
    const withRole = <P extends Record<string, unknown>>(p: P) => ({
      ...p,
      role: { id: 1 },
      apiToken: null,
    });

    test('Remove permission that dont exist + clean fields', async () => {
      const permsInDb = [
        withRole({
          id: 1,
          action: 'action-1',
          actionParameters: {},
          properties: { fields: ['name'] },
        }),
        withRole({
          id: 2,
          action: 'action-2',
          actionParameters: {},
          properties: { fields: ['name'] },
        }),
        withRole({
          id: 3,
          action: 'action-3',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name'] },
        }),
        withRole({
          id: 4,
          action: 'action-3',
          actionParameters: {},
          subject: 'planet',
          properties: { fields: ['name'] },
        }),
        withRole({
          id: 5,
          action: 'action-1',
          actionParameters: {},
          subject: 'planet',
          properties: { fields: ['name', 'description'] },
        }),
        withRole({
          id: 6,
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: [] },
        }),
      ];

      const permsWithCleanFields = [
        permsInDb[0],
        permsInDb[2],
        { ...permsInDb[4], properties: { fields: ['name', 'galaxy'] } },
        { ...permsInDb[5], properties: { fields: ['name'] } },
      ].map((p) => ({ ...p, conditions: [] }));

      const findMany = jest.fn(() => Promise.resolve(permsInDb));

      const cleanPermissionFields = jest.fn(() => toPermission(permsWithCleanFields as any));
      const dbDelete = jest.fn(() => Promise.resolve());
      const update = jest.fn(() => Promise.resolve());
      const count = jest.fn(() => Promise.resolve(4));

      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });

      global.strapi = merge(global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update, count }) },
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: jest.fn((id) => registeredPerms.has(id)),
                get: jest.fn((id) => registeredPerms.get(id)),
              },
            },
          },
        },
        eventHub: {
          emit: jest.fn(),
        },
      });

      await cleanPermissionsInDatabase();

      expect(findMany).toHaveBeenCalledWith({
        limit: 200,
        offset: 0,
        populate: ['role', 'apiToken'],
      });
      expect(update).toHaveBeenNthCalledWith(1, {
        where: { id: permsInDb[4].id },
        data: permsWithCleanFields[2],
      });

      expect(update).toHaveBeenNthCalledWith(2, {
        where: { id: permsInDb[5].id },
        data: permsWithCleanFields[3],
      });
      expect(dbDelete).toHaveBeenNthCalledWith(1, { where: { id: 2 } });
      expect(dbDelete).toHaveBeenNthCalledWith(2, { where: { id: 4 } });
    });

    test('removes orphaned permissions (no role AND no apiToken) but keeps role-only and apiToken-only', async () => {
      const permsInDb = [
        {
          id: 1,
          action: 'action-1',
          actionParameters: {},
          subject: 'api',
          properties: {},
          role: { id: 1 },
          apiToken: null,
        },
        {
          id: 2,
          action: 'action-1',
          actionParameters: {},
          subject: 'api',
          properties: {},
          role: null,
          apiToken: { id: 1 },
        },
        {
          id: 3,
          action: 'action-1',
          actionParameters: {},
          subject: 'api',
          properties: {},
          role: null,
          apiToken: null,
        },
      ];

      const findMany = jest.fn(() => Promise.resolve(permsInDb));
      const cleanPermissionFields = jest.fn((perms: unknown[]) => perms);
      const dbDelete = jest.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve({ where: { id: where.id } })
      );
      const update = jest.fn(() => Promise.resolve());
      const count = jest.fn(() => Promise.resolve(3));

      global.strapi = merge(global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update, count }) },
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: jest.fn(() => true),
                get: jest.fn(() => ({ subjects: ['api'], options: {} })),
              },
            },
          },
        },
        eventHub: { emit: jest.fn() },
      });

      await cleanPermissionsInDatabase();

      const deletedIds = dbDelete.mock.calls.map((c) => (c ? c[0].where.id : undefined));
      expect(deletedIds).toContain(3);
      expect(deletedIds).not.toContain(1);
      expect(deletedIds).not.toContain(2);
    });
  });
});
