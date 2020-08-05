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
      const assign = jest.fn();
      const assignARoleToAll = jest.fn();
      const getPermissionsWithNestedFields = jest.fn(() => [...permissions]); // cloned, otherwise it is modified inside createRolesIfNoneExist()

      global.strapi = {
        query: () => ({ count, create }),
        admin: {
          services: {
            permission: { actionProvider: { getAll }, assign },
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
        description: 'Authors can manage and publish the content they created.',
      });
      expect(getPermissionsWithNestedFields).toHaveBeenCalledWith(actions, {
        fieldsNullFor: ['plugins::content-manager.explorer.delete'],
        restrictedSubjects: ['plugins::users-permissions.user'],
      });
      expect(assign).toHaveBeenCalledTimes(2);
      expect(assign).toHaveBeenNthCalledWith(1, 2, [
        ...permissions,
        ...defaultPermissions.map(d => ({
          ...d,
          conditions: [],
        })),
      ]);

      expect(assign).toHaveBeenNthCalledWith(2, 3, [
        { ...permissions[0], conditions: ['admin::is-creator'] },
        ...defaultPermissions,
      ]);
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
});
