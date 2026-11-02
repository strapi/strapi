import { describe, test, expect, beforeEach, vi } from 'vitest';
import _, { merge } from 'lodash';

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
      log: { warn: vi.fn() },
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
      const findMany = vi.fn(() => Promise.resolve([]));
      global.strapi = merge({}, global.strapi, {
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
      const findMany = vi.fn(() => Promise.resolve([]));

      global.strapi = merge({}, global.strapi, {
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
      const isValidCondition = vi.fn((condition) => ['cond'].includes(condition));

      global.strapi = merge({}, global.strapi, {
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

      const findMany = vi.fn(() => Promise.resolve(permsInDb));

      const cleanPermissionFields = vi.fn(() => toPermission(permsWithCleanFields as any));
      const dbDelete = vi.fn(() => Promise.resolve());
      const update = vi.fn(() => Promise.resolve());
      const count = vi.fn(() => Promise.resolve(4));

      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update, count }) },
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: vi.fn((id) => registeredPerms.has(id)),
                get: vi.fn((id) => registeredPerms.get(id)),
              },
            },
          },
        },
        eventHub: {
          emit: vi.fn(),
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

      const findMany = vi.fn(() => Promise.resolve(permsInDb));
      const cleanPermissionFields = vi.fn((perms: unknown[]) => perms);
      const dbDelete = vi.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve({ where: { id: where.id } })
      );
      const update = vi.fn(() => Promise.resolve());
      const count = vi.fn(() => Promise.resolve(3));

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update, count }) },
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: vi.fn(() => true),
                get: vi.fn(() => ({ subjects: ['api'], options: {} })),
              },
            },
          },
        },
        eventHub: { emit: vi.fn() },
      });

      await cleanPermissionsInDatabase();

      const deletedIds = dbDelete.mock.calls.map((c) => (c ? c[0].where.id : undefined));
      expect(deletedIds).toContain(3);
      expect(deletedIds).not.toContain(1);
      expect(deletedIds).not.toContain(2);
    });

    test('keeps apiToken permissions when every applicable property is nil', async () => {
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
      ];

      const findMany = vi.fn(() => Promise.resolve(permsInDb));
      const cleanPermissionFields = vi.fn((perms: { properties: object }[]) =>
        perms.map((perm) => ({ ...perm, properties: { ...perm.properties, fields: [] } }))
      );
      const dbDelete = vi.fn(({ where }: { where: { id: number } }) =>
        Promise.resolve({ where: { id: where.id } })
      );
      const update = vi.fn(() => Promise.resolve());
      const count = vi.fn(() => Promise.resolve(2));

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update, count }) },
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: vi.fn(() => true),
                get: vi.fn(() => ({
                  subjects: ['api'],
                  options: { applyToProperties: ['fields', 'locales'] },
                })),
                appliesToProperty: vi.fn(() => Promise.resolve(true)),
              },
            },
          },
        },
        eventHub: { emit: vi.fn() },
      });

      await cleanPermissionsInDatabase();

      const deletedIds = dbDelete.mock.calls.map((c) => (c ? c[0].where.id : undefined));
      expect(deletedIds).toContain(1);
      expect(deletedIds).not.toContain(2);
      expect(update).not.toHaveBeenCalled();
    });

    describe('logging', () => {
      const setupCleanup = (permsInDb: unknown[], registeredActions: string[]) => {
        const warn = vi.fn();
        const dbDelete = vi.fn(() => Promise.resolve());

        global.strapi = merge({}, global.strapi, {
          log: { warn },
          db: {
            query: () => ({
              findMany: vi.fn(() => Promise.resolve(permsInDb)),
              delete: dbDelete,
              update: vi.fn(() => Promise.resolve()),
              count: vi.fn(() => Promise.resolve(permsInDb.length)),
            }),
          },
          admin: {
            services: {
              'content-type': { cleanPermissionFields: vi.fn((perms: unknown[]) => perms) },
              permission: {
                actionProvider: {
                  has: vi.fn((id: string) => registeredActions.includes(id)),
                  get: vi.fn(() => undefined),
                },
              },
            },
          },
          eventHub: { emit: vi.fn() },
        });

        return { warn, dbDelete };
      };

      const perm = (id: number, action: string, owner: Record<string, unknown>) => ({
        id,
        action,
        actionParameters: {},
        subject: null,
        properties: {},
        conditions: [],
        role: null,
        apiToken: null,
        ...owner,
      });

      test('warns with the count, actions, roles and admin tokens of the removed permissions', async () => {
        const auditor = { id: 3, name: 'QA Auditor' };
        const siemToken = { id: 7, name: 'qa-siem-token' };
        const { warn, dbDelete } = setupCleanup(
          [
            perm(1, 'admin::audit-logs.read', { role: auditor }),
            perm(2, 'admin::audit-logs.export', { role: auditor }),
            perm(3, 'admin::audit-logs.read', { apiToken: siemToken }),
            perm(4, 'admin::audit-logs.export', { apiToken: siemToken }),
            perm(5, 'admin::users.read', { role: auditor }),
            perm(6, 'admin::users.read', {}),
          ],
          ['admin::users.read']
        );

        await cleanPermissionsInDatabase();

        expect(dbDelete).toHaveBeenCalledTimes(5);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
          'Removed 5 stored admin permission(s) that no longer match a registered action, subject or owner. ' +
            'Actions: admin::audit-logs.read, admin::audit-logs.export, admin::users.read. ' +
            'Roles: "QA Auditor" (id 3). ' +
            'Admin tokens: "qa-siem-token" (id 7). ' +
            'Without role or admin token: 1.'
        );
      });

      test('does not warn when nothing is removed', async () => {
        const { warn, dbDelete } = setupCleanup(
          [perm(1, 'admin::users.read', { role: { id: 1, name: 'Editor' } })],
          ['admin::users.read']
        );

        await cleanPermissionsInDatabase();

        expect(dbDelete).not.toHaveBeenCalled();
        expect(warn).not.toHaveBeenCalled();
      });
    });
  });
});
