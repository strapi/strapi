'use strict';

const _ = require('lodash');
const { merge } = require('lodash/fp');
const permissionService = require('../permission');
const { toPermission } = require('../../domain/permission');

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
    };
  });

  describe('Find permissions', () => {
    test('Find calls the right db query', async () => {
      const find = jest.fn(() => Promise.resolve([]));
      global.strapi = merge(global.strapi, {
        query() {
          return { find };
        },
      });

      await permissionService.find({ role: 1 });

      expect(find).toHaveBeenCalledWith({ role: 1 }, []);
    });
  });

  describe('Find User Permissions', () => {
    test('Find calls the right db query', async () => {
      const find = jest.fn(({ role_in }) => role_in.map(roleId => ({ role: roleId })));

      global.strapi = merge(global.strapi, {
        query() {
          return { find };
        },
      });

      const rolesId = [1, 2];

      const res = await permissionService.findUserPermissions({
        roles: rolesId.map(id => ({ id })),
      });

      expect(find).toHaveBeenCalledWith({ role_in: rolesId, _limit: -1 }, []);
      expect(res.map(permission => permission.role)).toStrictEqual(rolesId);
    });

    test('Returns default result when no roles provided', async () => {
      const res = await permissionService.findUserPermissions({});

      expect(res).toStrictEqual([]);
    });
  });

  describe('Sanitize Permission', () => {
    test('Removes unwanted properties', () => {
      const isValidCondition = jest.fn(condition => ['cond'].includes(condition));

      global.strapi = merge(global.strapi, {
        admin: { services: { condition: { isValidCondition } } },
      });

      const permission = {
        action: 'read',
        subject: 'article',
        properties: { fields: ['*'] },
        conditions: ['cond'],
        foo: 'bar',
      };

      const sanitizedPermission = permissionService.sanitizePermission(permission);

      expect(sanitizedPermission.foo).toBeUndefined();
      expect(sanitizedPermission).toMatchObject({
        ..._.omit(permission, 'foo'),
      });
    });
  });

  describe('cleanPermissionsInDatabase', () => {
    test('Remove permission that dont exist + clean fields', async () => {
      const permsInDb = [
        {
          id: 1,
          action: 'action-1',
          properties: { fields: ['name'] },
        },
        {
          id: 2,
          action: 'action-2',
          properties: { fields: ['name'] },
        },
        {
          id: 3,
          action: 'action-3',
          subject: 'country',
          properties: { fields: ['name'] },
        },
        {
          id: 4,
          action: 'action-3',
          subject: 'planet',
          properties: { fields: ['name'] },
        },
        {
          id: 5,
          action: 'action-1',
          subject: 'planet',
          properties: { fields: ['name', 'description'] },
        },
        {
          id: 6,
          action: 'action-1',
          subject: 'country',
          properties: { fields: null },
        },
      ];

      const permsWithCleanFields = [
        permsInDb[0],
        permsInDb[2],
        { ...permsInDb[4], properties: { fields: ['name', 'galaxy'] } },
        { ...permsInDb[5], properties: { fields: ['name'] } },
      ].map(p => ({ ...p, conditions: [] }));

      const findPage = jest.fn(() =>
        Promise.resolve({
          results: permsInDb,
          pagination: { total: 4 },
        })
      );
      const cleanPermissionFields = jest.fn(() => toPermission(permsWithCleanFields));
      const dbDelete = jest.fn(() => Promise.resolve());
      const update = jest.fn(() => Promise.resolve());
      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });

      global.strapi = merge(global.strapi, {
        query: () => ({ findPage, delete: dbDelete, update }),
        admin: {
          services: {
            'content-type': { cleanPermissionFields },
            permission: {
              actionProvider: {
                has: jest.fn(id => registeredPerms.has(id)),
                get: jest.fn(id => registeredPerms.get(id)),
              },
            },
          },
        },
      });

      await permissionService.cleanPermissionsInDatabase();

      expect(findPage).toHaveBeenCalledWith({ page: 1, pageSize: 200 }, []);
      expect(update).toHaveBeenNthCalledWith(1, { id: permsInDb[4].id }, permsWithCleanFields[2]);
      expect(update).toHaveBeenNthCalledWith(2, { id: permsInDb[5].id }, permsWithCleanFields[3]);
      expect(dbDelete).toHaveBeenCalledWith({ id_in: [2, 4] });
    });
  });
});
