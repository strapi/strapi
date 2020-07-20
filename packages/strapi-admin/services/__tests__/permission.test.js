'use strict';

const _ = require('lodash');
const permissionService = require('../permission');

describe('Permission Service', () => {
  describe('Find permissions', () => {
    test('Find calls the right db query', async () => {
      const find = jest.fn(() => Promise.resolve([]));
      global.strapi = {
        query() {
          return { find };
        },
      };

      await permissionService.find({ role: 1 });

      expect(find).toHaveBeenCalledWith({ role: 1 }, []);
    });
  });

  describe('Assign permissions', () => {
    test('Delete previous permissions', async () => {
      const createMany = jest.fn(() => Promise.resolve([]));
      const find = jest.fn(() => Promise.resolve([{ id: 3 }]));
      const deleteFn = jest.fn();
      const getAll = jest.fn(() => []);

      global.strapi = {
        admin: { services: { permission: { actionProvider: { getAll } } } },
        query() {
          return { delete: deleteFn, createMany, find };
        },
      };

      await permissionService.assign(1, []);

      expect(deleteFn).toHaveBeenCalledWith({ id_in: [3] });
    });

    test('Create new permissions', async () => {
      const permissions = Array(5)
        .fill(0)
        .map((v, i) => ({ action: `action-${i}` }));

      const deleteFn = jest.fn(() => Promise.resolve([]));
      const createMany = jest.fn(() => Promise.resolve([]));
      const find = jest.fn(() => Promise.resolve([]));
      const getAll = jest.fn(() => permissions.map(perm => ({ actionId: perm.action })));
      const removeUnkownConditionIds = jest.fn(conds => _.intersection(conds, ['cond']));

      global.strapi = {
        admin: {
          services: {
            permission: {
              actionProvider: { getAll },
              conditionProvider: {
                getAll: jest.fn(() => [{ id: 'admin::is-creator' }]),
              },
            },
            condition: {
              removeUnkownConditionIds,
            },
          },
        },
        query() {
          return { delete: deleteFn, createMany, find };
        },
      };

      const permissionsToAssign = [...permissions];
      permissionsToAssign[4] = {
        ...permissions[4],
        conditions: ['cond', 'unknown-cond'],
      };

      await permissionService.assign(1, permissionsToAssign);

      expect(createMany).toHaveBeenCalledTimes(1);
      expect(createMany).toHaveBeenCalledWith([
        { action: 'action-0', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-1', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-2', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-3', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-4', conditions: ['cond'], fields: null, role: 1, subject: null },
      ]);
    });
  });

  describe('Find User Permissions', () => {
    test('Find calls the right db query', async () => {
      const find = jest.fn(({ role_in }) => role_in);

      global.strapi = {
        query() {
          return { find };
        },
      };

      const rolesId = [1, 2];

      const res = await permissionService.findUserPermissions({
        roles: rolesId.map(id => ({ id })),
      });

      expect(find).toHaveBeenCalledWith({ role_in: rolesId, _limit: -1 });
      expect(res).toStrictEqual(rolesId);
    });

    test('Returns default result when no roles provided', async () => {
      const res = await permissionService.findUserPermissions({});

      expect(res).toStrictEqual([]);
    });
  });

  describe('Sanitize Permission', () => {
    test('Removes unwanted properties', () => {
      const removeUnkownConditionIds = jest.fn(() => ['cond']);
      global.strapi = {
        admin: { services: { condition: { removeUnkownConditionIds } } },
      };
      const permission = {
        action: 'read',
        subject: 'article',
        fields: ['*'],
        conditions: ['cond', 'unknown-cond'],
        foo: 'bar',
      };

      const sanitizedPermission = permissionService.sanitizePermission(permission);

      expect(sanitizedPermission.foo).toBeUndefined();
      expect(sanitizedPermission).toMatchObject({
        ..._.omit(permission, 'foo'),
        conditions: ['cond'],
      });
    });
  });

  describe('cleanPermissionInDatabase', () => {
    test('Remove permission that dont exist + clean fields', async () => {
      const permsInDb = [
        {
          id: 1,
          action: 'action-1',
          fields: ['name'],
        },
        {
          id: 2,
          action: 'action-2',
          fields: ['name'],
        },
        {
          id: 3,
          action: 'action-3',
          subject: 'country',
          fields: ['name'],
        },
        {
          id: 4,
          action: 'action-3',
          subject: 'planet',
          fields: ['name'],
        },
        {
          id: 5,
          action: 'action-1',
          subject: 'planet',
          fields: ['name', 'description'],
        },
        {
          id: 6,
          action: 'action-1',
          subject: 'country',
          fields: null,
        },
      ];

      const permsWithCleanFields = [
        permsInDb[0],
        permsInDb[2],
        { ...permsInDb[4], fields: ['name', 'galaxy'] },
        { ...permsInDb[5], fields: ['name'] },
      ];

      const findPage = jest.fn(() =>
        Promise.resolve({
          results: permsInDb,
          pagination: { total: 4 },
        })
      );
      const cleanPermissionFields = jest.fn(() => permsWithCleanFields);
      const dbDelete = jest.fn(() => Promise.resolve());
      const update = jest.fn(() => Promise.resolve());
      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });
      const getAllByMap = jest.fn(() => registeredPerms);
      const prevGetAllByMap = permissionService.actionProvider.getAllByMap;
      permissionService.actionProvider.getAllByMap = getAllByMap;

      global.strapi = {
        query: () => ({ findPage, delete: dbDelete, update }),
        admin: { services: { 'content-type': { cleanPermissionFields } } },
      };

      await permissionService.cleanPermissionInDatabase();

      expect(findPage).toHaveBeenCalledWith({ page: 1, pageSize: 200 }, []);
      expect(update).toHaveBeenNthCalledWith(1, { id: permsInDb[4].id }, permsWithCleanFields[2]);
      expect(update).toHaveBeenNthCalledWith(2, { id: permsInDb[5].id }, permsWithCleanFields[3]);
      expect(getAllByMap).toHaveBeenCalledWith();
      expect(dbDelete).toHaveBeenCalledWith({ id_in: [2, 4] });

      // restauring actionProvider
      permissionService.actionProvider.getAllByMap = prevGetAllByMap;
    });
  });

  describe('resetSuperAdminPermissions', () => {
    test('No superAdmin role exist', async () => {
      const getSuperAdmin = jest.fn(() => Promise.resolve(undefined));
      const createMany = jest.fn();

      global.strapi = {
        query: () => ({ createMany }),
        admin: { services: { role: { getSuperAdmin } } },
      };

      await permissionService.resetSuperAdminPermissions();

      expect(createMany).toHaveBeenCalledTimes(0);
    });
    test('Reset super admin permissions', async () => {
      const actions = [
        {
          actionId: 'action-1',
          subjects: ['country'],
          section: 'contentTypes',
        },
      ];
      const permissions = [
        {
          action: 'action-1',
          subject: 'country',
          fields: ['name'],
          conditions: [],
        },
      ];
      const getAll = jest.fn(() => actions);
      const getAllConditions = jest.fn(() => []);
      const find = jest.fn(() => [{ action: 'action-2', id: 2 }]);
      const deleteFn = jest.fn(() => []);
      const getPermissionsWithNestedFields = jest.fn(() => [...permissions]); // cloned, otherwise it is modified inside resetSuperAdminPermissions()
      const getSuperAdmin = jest.fn(() => Promise.resolve({ id: 1 }));
      const createMany = jest.fn(() => Promise.resolve([{ ...permissions[0], role: { id: 1 } }]));
      const removeUnkownConditionIds = jest.fn(conds => conds);

      global.strapi = {
        query: () => ({ createMany, find, delete: deleteFn }),
        admin: {
          services: {
            permission: {
              actionProvider: { getAll },
              conditionProvider: { getAll: getAllConditions },
            },
            condition: { removeUnkownConditionIds },
            'content-type': { getPermissionsWithNestedFields },
            role: { getSuperAdmin },
          },
        },
      };

      await permissionService.resetSuperAdminPermissions();

      expect(deleteFn).toHaveBeenCalledWith({ id_in: [2] });
      expect(createMany).toHaveBeenCalledWith([
        {
          ...permissions[0],
          role: 1,
        },
      ]);
    });
  });
});
