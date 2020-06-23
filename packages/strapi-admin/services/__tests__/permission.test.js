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
      const deleteFn = jest.fn(() => Promise.resolve([]));
      const createMany = jest.fn(() => Promise.resolve([]));
      const find = jest.fn(() => Promise.resolve([]));
      const getAll = jest.fn(() =>
        Array(5)
          .fill(0)
          .map((v, i) => ({ actionId: `action-${i}` }))
      );

      global.strapi = {
        admin: {
          services: {
            permission: {
              actionProvider: { getAll },
              conditionProvider: {
                getAll: jest.fn(() => [{ id: 'admin::is-creator' }]),
              },
            },
          },
        },
        query() {
          return { delete: deleteFn, createMany, find };
        },
      };

      const permissions = Array(5)
        .fill(0)
        .map((v, i) => ({ action: `action-${i}` }));

      await permissionService.assign(1, permissions);

      expect(createMany).toHaveBeenCalledTimes(1);
      expect(createMany).toHaveBeenCalledWith([
        { action: 'action-0', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-1', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-2', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-3', conditions: [], fields: null, role: 1, subject: null },
        { action: 'action-4', conditions: [], fields: null, role: 1, subject: null },
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
      const permission = {
        action: 'read',
        subject: 'article',
        fields: ['*'],
        conditions: ['cond'],
        foo: 'bar',
      };

      const sanitizedPermission = permissionService.sanitizePermission(permission);

      expect(sanitizedPermission.foo).toBeUndefined();
      expect(sanitizedPermission).toMatchObject(_.omit(permission, 'foo'));
    });
  });

  describe('cleanPermissionInDatabase', () => {
    test("Clean only the permissions that don't exist anymore", async () => {
      const permsInDb = [
        {
          id: 1,
          action: 'action-1',
        },
        {
          id: 2,
          action: 'action-2',
        },
        {
          id: 3,
          action: 'action-3',
          subject: 'country',
        },
        {
          id: 4,
          action: 'action-3',
          subject: 'planet',
        },
      ];

      const dbFind = jest.fn(() => Promise.resolve(permsInDb));
      const dbDelete = jest.fn(() => Promise.resolve());
      const registeredPerms = new Map();
      registeredPerms.set('action-1', {});
      registeredPerms.set('action-3', { subjects: ['country'] });
      const getAllByMap = jest.fn(() => registeredPerms);
      const prevGetAllByMap = permissionService.actionProvider.getAllByMap;
      permissionService.actionProvider.getAllByMap = getAllByMap;

      global.strapi = {
        query: () => ({ find: dbFind, delete: dbDelete }),
      };

      await permissionService.cleanPermissionInDatabase();

      expect(dbFind).toHaveBeenCalledWith({}, []);
      expect(getAllByMap).toHaveBeenCalledWith();
      expect(dbDelete).toHaveBeenCalledWith({ id_in: [2, 4] });

      // restauring actionProvider
      permissionService.actionProvider.getAllByMap = prevGetAllByMap;
    });
  });
});
