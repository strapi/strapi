'use strict';

const _ = require('lodash');
const roleService = require('../role');
const { SUPER_ADMIN_CODE } = require('../constants');

describe('Role', () => {
  describe('create', () => {
    test('Creates a role', async () => {
      const dbCreate = jest.fn(role => Promise.resolve(role));
      const dbCount = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        query: () => ({ create: dbCreate, count: dbCount }),
      };

      const input = {
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
        code: 'super-admin',
      };

      const createdRole = await roleService.create(input);

      expect(dbCreate).toHaveBeenCalledWith(input);
      expect(createdRole).toStrictEqual(input);
    });
  });
  describe('findOne', () => {
    test('Finds a role', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
      };
      const dbFindOne = jest.fn(({ id }) => Promise.resolve(_.find([role], { id })));

      global.strapi = {
        query: () => ({ findOne: dbFindOne }),
      };

      const foundRole = await roleService.findOne({ id: role.id });

      expect(dbFindOne).toHaveBeenCalledWith({ id: role.id }, []);
      expect(foundRole).toStrictEqual(role);
    });
    test('Finds a role with usersCount', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: "Have all permissions. Can't be delete",
        usersCount: 0,
      };
      const dbFindOne = jest.fn(({ id }) =>
        Promise.resolve(_.find([_.omit(role, ['usersCount'])], { id }))
      );
      const dbCount = jest.fn(() => Promise.resolve(0));
      global.strapi = {
        query: () => ({ findOne: dbFindOne, count: dbCount }),
      };

      const foundRole = await roleService.findOneWithUsersCount({ id: role.id });

      expect(dbFindOne).toHaveBeenCalledWith({ id: role.id }, []);
      expect(dbCount).toHaveBeenCalledWith({ roles: [role.id] });
      expect(foundRole).toStrictEqual(role);
    });
  });
  describe('find', () => {
    test('Finds roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'super_admin',
          description: "Have all permissions. Can't be delete",
        },
      ];
      const dbFind = jest.fn(() => Promise.resolve(roles));

      global.strapi = {
        query: () => ({ find: dbFind }),
      };

      const foundRoles = await roleService.find();

      expect(dbFind).toHaveBeenCalledWith({}, []);
      expect(foundRoles).toStrictEqual(roles);
    });
  });
  describe('findAll', () => {
    test('Finds all roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'super_admin',
          description: "Have all permissions. Can't be delete",
          usersCount: 0,
        },
      ];
      const dbFind = jest.fn(() =>
        Promise.resolve(roles.map(role => _.omit(role, ['usersCount'])))
      );
      const dbCount = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        query: () => ({ find: dbFind, count: dbCount }),
      };

      const foundRoles = await roleService.findAllWithUsersCount();

      expect(dbFind).toHaveBeenCalledWith({ _limit: -1 }, []);
      expect(foundRoles).toStrictEqual(roles);
    });
  });
  describe('update', () => {
    test('Updates a role', async () => {
      const role = {
        id: 1,
        name: 'super_admin',
        description: 'AAA',
      };
      const expectedUpdatedRole = {
        id: 1,
        name: 'super_admin_updated',
        description: 'AAA_updated',
      };
      const dbUpdate = jest.fn(() => Promise.resolve(expectedUpdatedRole));
      const dbCount = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        query: () => ({ update: dbUpdate, count: dbCount }),
      };

      const updatedRole = await roleService.update(
        {
          id: role.id,
        },
        {
          name: expectedUpdatedRole.name,
          description: expectedUpdatedRole.description,
        }
      );

      expect(dbUpdate).toHaveBeenCalledWith(
        {
          id: role.id,
        },
        {
          name: expectedUpdatedRole.name,
          description: expectedUpdatedRole.description,
        }
      );
      expect(updatedRole).toStrictEqual(expectedUpdatedRole);
    });
    test('Cannot update code of super admin role', async () => {
      const dbUpdate = jest.fn();
      const dbFind = jest.fn(() => [{ id: '1' }]);
      const dbFindOne = jest.fn(() => ({ id: '1', code: SUPER_ADMIN_CODE }));
      const badRequest = jest.fn(() => {});

      global.strapi = {
        query: () => ({ find: dbFind, findOne: dbFindOne, update: dbUpdate }),
        admin: { config: { superAdminCode: SUPER_ADMIN_CODE } },
        errors: { badRequest },
      };

      await roleService.update({ id: 1 }, { code: 'new_code' });

      expect(dbUpdate).toHaveBeenCalledWith({ id: 1 }, {});
    });
  });
  describe('count', () => {
    test('getUsersCount', async () => {
      const roleId = 1;
      const dbCount = jest.fn(() => Promise.resolve(0));
      global.strapi = {
        query: () => ({ count: dbCount }),
      };

      const usersCount = await roleService.getUsersCount(roleId);

      expect(dbCount).toHaveBeenCalledWith({ roles: [roleId] });
      expect(usersCount).toEqual(0);
    });
  });
  describe('delete', () => {
    test('Delete a role', async () => {
      const role = {
        id: 3,
        name: 'admin',
        description: 'Description',
        users: [],
      };
      const dbCount = jest.fn(() => Promise.resolve(0));
      const dbFindOne = jest.fn(() => ({ id: 1, code: SUPER_ADMIN_CODE }));
      const dbDelete = jest.fn(() => Promise.resolve(role));
      const dbDeleteByRolesIds = jest.fn(() => Promise.resolve());

      global.strapi = {
        query: () => ({ delete: dbDelete, count: dbCount, findOne: dbFindOne }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
          },
          config: { superAdminCode: SUPER_ADMIN_CODE },
        },
      };

      const deletedRoles = await roleService.deleteByIds([role.id]);

      expect(dbCount).toHaveBeenCalledWith({ roles: [role.id] });
      expect(dbDelete).toHaveBeenCalledWith({ id_in: [role.id] });
      expect(deletedRoles).toStrictEqual([role]);
    });
    test('Delete two roles', async () => {
      const roles = [
        {
          id: 1,
          name: 'admin 1',
          description: 'Description',
          users: [],
        },
        {
          id: 2,
          name: 'admin 2',
          description: 'Description',
          users: [],
        },
      ];
      const dbCount = jest.fn(() => Promise.resolve(0));
      const dbFindOne = jest.fn(() => ({ id: 3, code: SUPER_ADMIN_CODE }));
      const rolesIds = roles.map(r => r.id);
      const dbDelete = jest.fn(() => Promise.resolve(roles));
      const dbGetUsersCount = jest.fn(() => Promise.resolve(0));
      const dbDeleteByRolesIds = jest.fn(() => Promise.resolve());

      global.strapi = {
        query: () => ({ delete: dbDelete, count: dbCount, findOne: dbFindOne }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
            role: { getUsersCount: dbGetUsersCount },
          },
          config: { superAdminCode: SUPER_ADMIN_CODE },
        },
      };

      const deletedRoles = await roleService.deleteByIds(rolesIds);

      expect(dbCount).toHaveBeenNthCalledWith(1, { roles: [rolesIds[0]] });
      expect(dbCount).toHaveBeenNthCalledWith(2, { roles: [rolesIds[1]] });
      expect(dbCount).toHaveBeenCalledTimes(2);
      expect(dbDelete).toHaveBeenCalledWith({ id_in: rolesIds });
      expect(deletedRoles).toStrictEqual(roles);
    });
    test('Cannot delete super admin role', async () => {
      const dbFind = jest.fn(() => [{ id: '1' }]);
      const dbFindOne = jest.fn(() => ({ id: '1', code: SUPER_ADMIN_CODE }));
      const badRequest = jest.fn(() => {});

      global.strapi = {
        query: () => ({ find: dbFind, findOne: dbFindOne }),
        admin: { config: { superAdminCode: SUPER_ADMIN_CODE } },
        errors: { badRequest },
      };

      try {
        await roleService.deleteByIds([1]);
      } catch (e) {
        // nothing
      }

      expect(badRequest).toHaveBeenCalledWith('ValidationError', {
        ids: ['You cannot delete the super admin role'],
      });
    });
  });
  describe('Count roles', () => {
    test('Count roles without params', async () => {
      const count = jest.fn(() => Promise.resolve(2));
      global.strapi = {
        query: () => ({ count }),
      };

      const amount = await roleService.count();

      expect(amount).toBe(2);
      expect(count).toHaveBeenCalledWith({});
    });

    test('Count roles with params', async () => {
      const count = jest.fn(() => Promise.resolve(2));
      global.strapi = {
        query: () => ({ count }),
      };

      const params = { foo: 'bar' };
      const amount = await roleService.count(params);

      expect(amount).toBe(2);
      expect(count).toHaveBeenCalledWith(params);
    });
  });
  describe('createRolesIfNoneExist', () => {
    test("Don't create roles if one already exist", async () => {
      const count = jest.fn(() => Promise.resolve(1));
      const create = jest.fn();
      global.strapi = {
        query: () => ({ count, create }),
      };
      await roleService.createRolesIfNoneExist();

      expect(create).toHaveBeenCalledTimes(0);
    });
    test('Create 3 roles if none exist', async () => {
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

      const defaultPermissions = [
        {
          action: 'plugins::upload.read',
          conditions: ['admin::is-creator'],
          fields: null,
          subject: null,
        },
        {
          action: 'plugins::upload.assets.create',
          conditions: [],
          fields: null,
          subject: null,
        },
        {
          action: 'plugins::upload.assets.update',
          conditions: ['admin::is-creator'],
          fields: null,
          subject: null,
        },
        {
          action: 'plugins::upload.assets.download',
          conditions: [],
          fields: null,
          subject: null,
        },
        {
          action: 'plugins::upload.assets.copy-link',
          conditions: [],
          fields: null,
          subject: null,
        },
      ];

      const count = jest.fn(() => Promise.resolve(0));
      let id = 1;
      const create = jest.fn(role => ({ ...role, id: id++ }));
      const getAll = jest.fn(() => actions);
      const createMany = jest.fn();
      const assignARoleToAll = jest.fn();
      const getPermissionsWithNestedFields = jest.fn(() => [...permissions]); // cloned, otherwise it is modified inside createRolesIfNoneExist()

      global.strapi = {
        query: () => ({ count, create }),
        admin: {
          services: {
            permission: { actionProvider: { getAll }, createMany },
            'content-type': { getPermissionsWithNestedFields },
            user: { assignARoleToAll },
          },
        },
      };
      await roleService.createRolesIfNoneExist();

      expect(create).toHaveBeenCalledTimes(3);
      expect(create).toHaveBeenNthCalledWith(1, {
        name: 'Super Admin',
        code: 'strapi-super-admin',
        description: 'Super Admins can access and manage all features and settings.',
      });
      expect(assignARoleToAll).toHaveBeenCalledWith(1);
      expect(create).toHaveBeenNthCalledWith(2, {
        name: 'Editor',
        code: 'strapi-editor',
        description: 'Editors can manage and publish contents including those of other users.',
      });
      expect(create).toHaveBeenNthCalledWith(3, {
        name: 'Author',
        code: 'strapi-author',
        description: 'Authors can manage the content they have created.',
      });
      expect(getPermissionsWithNestedFields).toHaveBeenCalledWith(actions, {
        restrictedSubjects: ['plugins::users-permissions.user'],
      });
      expect(createMany).toHaveBeenCalledTimes(2);
      expect(createMany).toHaveBeenNthCalledWith(
        1,
        [
          ...permissions,
          ...defaultPermissions.map(d => ({
            ...d,
            conditions: [],
          })),
        ].map(p => ({ ...p, role: 2 }))
      );

      expect(createMany).toHaveBeenNthCalledWith(
        2,
        [
          { ...permissions[0], conditions: ['admin::is-creator'] },
          ...defaultPermissions,
        ].map(p => ({ ...p, role: 3 }))
      );
    });
  });
  describe('displayWarningIfNoSuperAdmin', () => {
    test('superAdmin role exists & a user is superAdmin', async () => {
      const findOne = jest.fn(() => ({ id: 1 }));
      const count = jest.fn(() => Promise.resolve(1));
      const exists = jest.fn(() => Promise.resolve(true));
      const warn = jest.fn();

      global.strapi = {
        query: () => ({ findOne, count }),
        admin: { services: { user: { exists } } },
        log: { warn },
      };

      await roleService.displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledTimes(0);
    });
    test("superAdmin role doesn't exist", async () => {
      const findOne = jest.fn(() => undefined);
      const count = jest.fn(() => Promise.resolve(0));
      const exists = jest.fn(() => Promise.resolve(false));
      const warn = jest.fn();

      global.strapi = {
        query: () => ({ findOne, count }),
        admin: { services: { user: { exists } } },
        log: { warn },
      };

      await roleService.displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledWith("Your application doesn't have a super admin role.");
    });
    test('superAdmin role exist & no user is superAdmin', async () => {
      const findOne = jest.fn(() => ({ id: 1 }));
      const count = jest.fn(() => Promise.resolve(0));
      const exists = jest.fn(() => Promise.resolve(true));
      const warn = jest.fn();

      global.strapi = {
        query: () => ({ findOne, count }),
        admin: { services: { user: { exists } } },
        log: { warn },
      };

      await roleService.displayWarningIfNoSuperAdmin();

      expect(warn).toHaveBeenCalledWith("Your application doesn't have a super admin user.");
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

      await roleService.resetSuperAdminPermissions();

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
      const getPermissionsWithNestedFields = jest.fn(() => [...permissions]); // cloned, otherwise it is modified inside resetSuperAdminPermissions()
      const deleteByIds = jest.fn();
      const getSuperAdmin = jest.fn(() => Promise.resolve({ id: 1 }));
      const createMany = jest.fn(() => Promise.resolve([{ ...permissions[0], role: { id: 1 } }]));
      const removeUnkownConditionIds = jest.fn(conds => conds);

      global.strapi = {
        admin: {
          services: {
            permission: {
              createMany,
              find,
              actionProvider: { getAll },
              conditionProvider: { getAll: getAllConditions },
              deleteByIds,
            },
            condition: { removeUnkownConditionIds },
            'content-type': { getPermissionsWithNestedFields },
            role: { getSuperAdmin },
          },
        },
      };

      await roleService.resetSuperAdminPermissions();

      expect(deleteByIds).toHaveBeenCalledWith([2]);
      expect(createMany).toHaveBeenCalledWith([
        {
          ...permissions[0],
          role: 1,
        },
      ]);
    });
  });
  describe('Assign permissions', () => {
    test('Delete previous permissions', async () => {
      const createMany = jest.fn(() => Promise.resolve([]));
      const getSuperAdmin = jest.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = jest.fn();
      const find = jest.fn(() => Promise.resolve([{ id: 3 }]));
      const deleteByIds = jest.fn();
      const getAll = jest.fn(() => []);

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            permission: { find, createMany, actionProvider: { getAll }, deleteByIds },
            role: { getSuperAdmin },
          },
        },
      };

      await roleService.assignPermissions(1, []);

      expect(deleteByIds).toHaveBeenCalledWith([3]);
    });

    test('Create new permissions', async () => {
      const permissions = Array(5)
        .fill(0)
        .map((v, i) => ({ action: `action-${i}` }));

      const createMany = jest.fn(() => Promise.resolve([]));
      const getSuperAdmin = jest.fn(() => Promise.resolve({ id: 0 }));
      const sendDidUpdateRolePermissions = jest.fn();
      const find = jest.fn(() => Promise.resolve([]));
      const getAll = jest.fn(() => permissions.map(perm => ({ actionId: perm.action })));
      const removeUnkownConditionIds = jest.fn(conds => _.intersection(conds, ['cond']));

      global.strapi = {
        admin: {
          services: {
            metrics: { sendDidUpdateRolePermissions },
            role: { getSuperAdmin },
            permission: {
              find,
              createMany,
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
      };

      const permissionsToAssign = [...permissions];
      permissionsToAssign[4] = {
        ...permissions[4],
        conditions: ['cond', 'unknown-cond'],
      };

      await roleService.assignPermissions(1, permissionsToAssign);

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
});
