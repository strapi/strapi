'use strict';

const _ = require('lodash');
const roleService = require('../role');

describe('Role', () => {
  describe('create', () => {
    test('Creates a role', async () => {
      const dbCreate = jest.fn(role => Promise.resolve(role));

      global.strapi = {
        query: () => ({ create: dbCreate }),
      };

      const input = { name: 'super_admin', description: "Have all permissions. Can't be delete" };

      const createdRole = await roleService.create(input);

      expect(dbCreate).toHaveBeenCalledWith(input);
      expect(createdRole).toStrictEqual(input);
    });
  });
  describe('find one', () => {
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

      expect(dbFindOne).toHaveBeenCalledWith({ id: role.id });
      expect(foundRole).toStrictEqual(role);
    });
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

      expect(dbFind).toHaveBeenCalledWith({});
      expect(foundRoles).toStrictEqual(roles);
    });
    test('Finds all roles', async () => {
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

      const foundRoles = await roleService.findAll();

      expect(dbFind).toHaveBeenCalledWith({ _limit: -1 });
      expect(foundRoles).toStrictEqual(roles);
    });
    test('Fetches all roles', async () => {
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

      const fetchedRole = await roleService.fetchAll();

      expect(dbFind).toHaveBeenCalled();
      expect(fetchedRole).toStrictEqual(roles);
    });
  });
});
