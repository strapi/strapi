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

      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update }) },
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
        where: {},
        orderBy: { id: 'asc' },
        limit: 200,
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

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update }) },
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

      global.strapi = merge({}, global.strapi, {
        db: { query: () => ({ findMany, delete: dbDelete, update }) },
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

    describe('applicable properties', () => {
      const setupPropertyCleanup = (permsInDb: Record<string, unknown>[]) => {
        const dbDelete = vi.fn(({ where }: { where: { id: number } }) =>
          Promise.resolve({ where: { id: where.id } })
        );
        // Returns the rows once, then an empty page, like the id-paged query does
        const findMany = vi
          .fn()
          .mockImplementationOnce(() => Promise.resolve(permsInDb))
          .mockImplementation(() => Promise.resolve([]));

        global.strapi = merge({}, global.strapi, {
          log: { warn: vi.fn() },
          db: { query: () => ({ findMany, delete: dbDelete, update: vi.fn() }) },
          admin: {
            services: {
              'content-type': { cleanPermissionFields: vi.fn((perms: unknown[]) => perms) },
              permission: {
                actionProvider: {
                  has: vi.fn(() => true),
                  get: vi.fn(() => ({
                    subjects: ['api::article.article'],
                    options: { applyToProperties: ['locales'] },
                  })),
                  appliesToProperty: vi.fn(() => Promise.resolve(true)),
                },
              },
            },
          },
          eventHub: { emit: vi.fn() },
        });

        return { dbDelete };
      };

      const localizedPermission = (id: number, properties: Record<string, unknown>) => ({
        id,
        action: 'plugin::content-manager.explorer.delete',
        actionParameters: {},
        subject: 'api::article.article',
        properties,
        conditions: [],
        role: { id: 1, name: 'Editor' },
        apiToken: null,
      });

      test('keeps a permission whose applicable property is null', async () => {
        const { dbDelete } = setupPropertyCleanup([localizedPermission(1, { locales: null })]);

        await cleanPermissionsInDatabase();

        expect(dbDelete).not.toHaveBeenCalled();
      });

      test('removes a permission that lacks its applicable property', async () => {
        const { dbDelete } = setupPropertyCleanup([localizedPermission(1, {})]);

        await cleanPermissionsInDatabase();

        expect(dbDelete).toHaveBeenCalledTimes(1);
        expect(dbDelete).toHaveBeenCalledWith({ where: { id: 1 } });
      });
    });

    type StoredPermission = { id: number } & Record<string, unknown>;

    type FindManyParams = {
      where?: { id?: { $gt?: number } };
      orderBy?: { id?: 'asc' | 'desc' };
      limit?: number;
      offset?: number;
    };

    /**
     * In-memory `admin::permission` table: a delete removes the row, so the rows after it
     * shift down like they do in a real database
     */
    const createPermissionTable = (permsInDb: StoredPermission[]) => {
      const rows = [...permsInDb];

      const findMany = vi.fn(({ where, orderBy, limit, offset = 0 }: FindManyParams) => {
        const afterId = where?.id?.$gt;
        const matching = rows.filter((row) => afterId === undefined || row.id > afterId);
        const sorted =
          orderBy?.id === undefined
            ? matching
            : [...matching].sort((a, b) => (orderBy.id === 'asc' ? a.id - b.id : b.id - a.id));
        const end = limit === undefined ? undefined : offset + limit;

        return Promise.resolve(sorted.slice(offset, end));
      });

      const dbDelete = vi.fn(({ where }: { where: { id: number } }) => {
        const index = rows.findIndex((row) => row.id === where.id);
        const [deleted] = index === -1 ? [null] : rows.splice(index, 1);

        return Promise.resolve(deleted);
      });

      return {
        rows,
        findMany,
        dbDelete,
        update: vi.fn(() => Promise.resolve()),
      };
    };

    describe('logging', () => {
      const setupCleanup = (
        permsInDb: StoredPermission[],
        registeredActions: string[],
        actionSubjects: Record<string, string[]> = {},
        actionProperties: Record<string, string[]> = {}
      ) => {
        const warn = vi.fn();
        const table = createPermissionTable(permsInDb);
        const { dbDelete } = table;

        global.strapi = merge({}, global.strapi, {
          log: { warn },
          db: {
            query: () => ({
              findMany: table.findMany,
              delete: dbDelete,
              update: table.update,
            }),
          },
          admin: {
            services: {
              'content-type': { cleanPermissionFields: vi.fn((perms: unknown[]) => perms) },
              permission: {
                actionProvider: {
                  has: vi.fn((id: string) => registeredActions.includes(id)),
                  get: vi.fn((id: string) => {
                    if (registeredActions.includes(id) === false) {
                      return undefined;
                    }

                    return {
                      subjects: actionSubjects[id],
                      options:
                        actionProperties[id] === undefined
                          ? {}
                          : { applyToProperties: actionProperties[id] },
                    };
                  }),
                  appliesToProperty: vi.fn(async (property: string, id: string) =>
                    (actionProperties[id] ?? []).includes(property)
                  ),
                },
              },
            },
          },
          eventHub: { emit: vi.fn() },
        });

        return { warn, dbDelete, table };
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
          'Removed 5 stored admin permission(s) that no longer match a registered action, a valid subject or valid properties, or have no owner. ' +
            'Reasons: unregistered action: 4, no owner: 1. ' +
            'Actions: "admin::audit-logs.read", "admin::audit-logs.export", "admin::users.read". ' +
            'Subjects: none. ' +
            'Roles: "QA Auditor" (id 3). ' +
            'Admin tokens: "qa-siem-token" (id 7). ' +
            'Without role or admin token: 1.'
        );
      });

      test('names the reason each permission was removed for', async () => {
        const editor = { id: 2, name: 'Editor' };
        const DELETE = 'plugin::content-manager.explorer.delete';
        const PUBLISH = 'plugin::content-manager.explorer.publish';
        const READ = 'plugin::content-manager.explorer.read';
        const ARTICLE = 'api::article.article';
        const { warn, dbDelete } = setupCleanup(
          [
            perm(1, 'admin::legacy.read', { role: editor }),
            { ...perm(2, READ, { role: editor }), subject: 'api::legacy.legacy' },
            { ...perm(3, DELETE, { role: editor }), subject: ARTICLE },
            { ...perm(4, PUBLISH, { role: editor }), subject: ARTICLE },
            perm(5, 'admin::users.read', {}),
            {
              ...perm(6, PUBLISH, { role: editor }),
              subject: ARTICLE,
              properties: { locales: ['en'] },
            },
          ],
          ['admin::users.read', READ, DELETE, PUBLISH],
          { [READ]: [ARTICLE], [DELETE]: [ARTICLE], [PUBLISH]: [ARTICLE] },
          { [READ]: ['fields', 'locales'], [DELETE]: ['locales'], [PUBLISH]: ['locales'] }
        );

        await cleanPermissionsInDatabase();

        expect(dbDelete).toHaveBeenCalledTimes(5);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
          'Removed 5 stored admin permission(s) that no longer match a registered action, a valid subject or valid properties, or have no owner. ' +
            'Reasons: unregistered action: 1, subject not handled: 1, missing properties (locales): 2, no owner: 1. ' +
            `Actions: "admin::legacy.read", "${READ}", "${DELETE}", "${PUBLISH}", "admin::users.read". ` +
            'Subjects: "api::legacy.legacy", "api::article.article". ' +
            'Roles: "Editor" (id 2). ' +
            'Admin tokens: none. ' +
            'Without role or admin token: 1.'
        );
      });

      test('lists the subjects of the removed permissions', async () => {
        const editor = { id: 2, name: 'Editor' };
        const { warn, dbDelete } = setupCleanup(
          [
            {
              ...perm(1, 'plugin::content-manager.explorer.read', { role: editor }),
              subject: 'api::article.article',
            },
            {
              ...perm(2, 'plugin::content-manager.explorer.read', { role: editor }),
              subject: 'api::legacy.legacy',
            },
            {
              ...perm(3, 'plugin::content-manager.explorer.update', { role: editor }),
              subject: 'api::legacy.legacy',
            },
          ],
          ['plugin::content-manager.explorer.read', 'plugin::content-manager.explorer.update'],
          {
            'plugin::content-manager.explorer.read': ['api::article.article'],
            'plugin::content-manager.explorer.update': ['api::article.article'],
          }
        );

        await cleanPermissionsInDatabase();

        expect(dbDelete).toHaveBeenCalledTimes(2);
        expect(warn).toHaveBeenCalledWith(
          'Removed 2 stored admin permission(s) that no longer match a registered action, a valid subject or valid properties, or have no owner. ' +
            'Reasons: subject not handled: 2. ' +
            'Actions: "plugin::content-manager.explorer.read", "plugin::content-manager.explorer.update". ' +
            'Subjects: "api::legacy.legacy". ' +
            'Roles: "Editor" (id 2). ' +
            'Admin tokens: none. ' +
            'Without role or admin token: 0.'
        );
      });

      test('warns once with the totals when the removed permissions span several pages', async () => {
        // 450 rows: 3 pages of 200, removed rows on each page
        const permsInDb = Array.from({ length: 450 }, (_, index) => {
          const id = index + 1;
          if (id <= 200) {
            return perm(id, 'admin::audit-logs.read', { role: { id: 3, name: 'QA Auditor' } });
          }
          if (id <= 400) {
            return perm(id, 'admin::audit-logs.export', { apiToken: { id: 7, name: 'siem' } });
          }
          return perm(id, 'admin::users.read', { role: { id: 2, name: 'Editor' } });
        });
        permsInDb[449] = perm(450, 'admin::legacy.read', { role: { id: 2, name: 'Editor' } });

        const { warn, dbDelete } = setupCleanup(permsInDb, ['admin::users.read']);

        await cleanPermissionsInDatabase();

        expect(dbDelete).toHaveBeenCalledTimes(401);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn).toHaveBeenCalledWith(
          'Removed 401 stored admin permission(s) that no longer match a registered action, a valid subject or valid properties, or have no owner. ' +
            'Reasons: unregistered action: 401. ' +
            'Actions: "admin::audit-logs.read", "admin::audit-logs.export", "admin::legacy.read". ' +
            'Subjects: none. ' +
            'Roles: "QA Auditor" (id 3), "Editor" (id 2). ' +
            'Admin tokens: "siem" (id 7). ' +
            'Without role or admin token: 0.'
        );
      });

      test('quotes actions, subjects, role and admin token names so the warning stays on one line', async () => {
        const { warn } = setupCleanup(
          [
            {
              ...perm(1, 'admin::legacy.read\u001b[2J', {
                role: { id: 3, name: 'Evil\nRole "x"\u0085\u2028\u2029' },
              }),
              subject: 'api::legacy.legacy\u009b\u202e',
            },
            perm(2, 'admin::legacy.read', { apiToken: { id: 7, name: 'evil\r\ntoken\u007f' } }),
          ],
          []
        );

        await cleanPermissionsInDatabase();

        expect(warn).toHaveBeenCalledTimes(1);
        const message = warn.mock.calls[0][0] as string;
        expect(message).not.toMatch(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u);
        expect(message).toContain(
          'Actions: "admin::legacy.read\\u001b[2J", "admin::legacy.read". '
        );
        expect(message).toContain('Subjects: "api::legacy.legacy\\u009b\\u202e". ');
        expect(message).toContain('Roles: "Evil\\nRole \\"x\\"\\u0085\\u2028\\u2029" (id 3). ');
        expect(message).toContain('Admin tokens: "evil\\r\\ntoken\\u007f" (id 7). ');
      });

      test('removes every stale permission in one run when they span several pages', async () => {
        // 450 rows, all of an unregistered action: 3 pages of 200
        const permsInDb = Array.from({ length: 450 }, (_, index) =>
          perm(index + 1, 'admin::legacy.read', { role: { id: 2, name: 'Editor' } })
        );

        const { warn, dbDelete, table } = setupCleanup(permsInDb, ['admin::users.read']);

        await cleanPermissionsInDatabase();

        expect(table.rows).toEqual([]);
        expect(dbDelete).toHaveBeenCalledTimes(450);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toMatch(/^Removed 450 stored admin permission\(s\)/);
      });

      test('keeps only the valid permissions in one run when stale and valid ones are interleaved across pages', async () => {
        // 450 rows, every odd id is of an unregistered action
        const permsInDb = Array.from({ length: 450 }, (_, index) => {
          const id = index + 1;
          const action = id % 2 === 1 ? 'admin::legacy.read' : 'admin::users.read';

          return perm(id, action, { role: { id: 2, name: 'Editor' } });
        });

        const { table } = setupCleanup(permsInDb, ['admin::users.read']);

        await cleanPermissionsInDatabase();

        expect(table.rows.map((row) => row.id)).toEqual(
          permsInDb.filter((row) => row.id % 2 === 0).map((row) => row.id)
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
