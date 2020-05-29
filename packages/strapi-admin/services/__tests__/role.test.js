'use strict';

const _ = require('lodash');
const roleService = require('../role');

describe('Role', () => {
  describe('create', () => {
    test('Creates a role', async () => {
      const dbCreate = jest.fn(role => Promise.resolve(role));
      const dbCount = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        query: () => ({ create: dbCreate, count: dbCount }),
      };

      const input = { name: 'super_admin', description: "Have all permissions. Can't be delete" };

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

      const foundRole = await roleService.findOneWithUsersCounts({ id: role.id });

      expect(dbFindOne).toHaveBeenCalledWith({ id: role.id }, []);
      expect(dbCount).toHaveBeenCalledWith({ 'roles.id': role.id });
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
      console.log('foundRoles', foundRoles);

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
  });
  describe('count', () => {
    test('getUsersCount', async () => {
      const roleId = 1;
      const dbCount = jest.fn(() => Promise.resolve(0));
      global.strapi = {
        query: () => ({ count: dbCount }),
      };

      const usersCount = await roleService.getUsersCount(roleId);

      expect(dbCount).toHaveBeenCalledWith({ 'roles.id': roleId });
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
      const dbDelete = jest.fn(() => Promise.resolve(role));
      const dbDeleteByRolesIds = jest.fn(() => Promise.resolve());

      global.strapi = {
        query: () => ({ delete: dbDelete, count: dbCount }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
          },
        },
      };

      const deletedRoles = await roleService.deleteByIds([role.id]);

      expect(dbCount).toHaveBeenCalledWith({ 'roles.id': role.id });
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
      const rolesIds = roles.map(r => r.id);
      const dbDelete = jest.fn(() => Promise.resolve(roles));
      const dbGetUsersCount = jest.fn(() => Promise.resolve(0));
      const dbDeleteByRolesIds = jest.fn(() => Promise.resolve());

      global.strapi = {
        query: () => ({ delete: dbDelete, count: dbCount }),
        admin: {
          services: {
            permission: { deleteByRolesIds: dbDeleteByRolesIds },
            role: { getUsersCount: dbGetUsersCount },
          },
        },
      };

      const deletedRoles = await roleService.deleteByIds(rolesIds);

      expect(dbCount).toHaveBeenNthCalledWith(1, { 'roles.id': rolesIds[0] });
      expect(dbCount).toHaveBeenNthCalledWith(2, { 'roles.id': rolesIds[1] });
      expect(dbCount).toHaveBeenCalledTimes(2);
      expect(dbDelete).toHaveBeenCalledWith({ id_in: rolesIds });
      expect(deletedRoles).toStrictEqual(roles);
    });
  });
});
