'use strict';

const roleController = require('../role');

const createContext = ({ params = {}, query = {}, body = {} }, overrides = {}) => ({
  params,
  query,
  request: {
    body,
  },
  ...overrides,
});

describe('Role controller', () => {
  describe('getPermissions', () => {
    test('Fails if role does not exist', async () => {
      const findOne = jest.fn(() => Promise.resolve());
      const notFound = jest.fn();

      const ctx = createContext(
        {
          params: { id: 1 },
        },
        {
          notFound,
        }
      );

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne,
            },
          },
        },
      };

      await roleController.getPermissions(ctx);

      expect(findOne).toHaveBeenCalledWith({ id: ctx.params.id });
      expect(notFound).toHaveBeenCalled();
    });

    test('Finds permissions correctly', async () => {
      const permissions = [
        {
          action: 'test1',
        },
        {
          action: 'test2',
          subject: 'model1',
        },
      ];

      const findOneRole = jest.fn(() => Promise.resolve({ id: 1 }));
      const findPermissions = jest.fn(() => Promise.resolve(permissions));

      const ctx = createContext({
        params: { id: 1 },
      });

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne: findOneRole,
            },
            permission: {
              find: findPermissions,
            },
          },
        },
      };

      await roleController.getPermissions(ctx);

      expect(findOneRole).toHaveBeenCalledWith({ id: ctx.params.id });
      expect(findPermissions).toHaveBeenCalledWith({ role: ctx.params.id, _limit: -1 });
      expect(ctx.body).toEqual({
        data: permissions,
      });
    });
  });

  describe('updatePermissions', () => {
    test('Fails on missing permissions input', async () => {
      const badRequest = jest.fn();

      const ctx = createContext(
        {
          params: { id: 1 },
          body: {},
        },
        { badRequest }
      );

      global.strapi = {
        admin: {
          services: {
            role: {
              getSuperAdmin: jest.fn(() => undefined),
            },
          },
        },
      };

      await roleController.updatePermissions(ctx);

      expect(badRequest).toHaveBeenCalledWith(
        'ValidationError',
        expect.objectContaining({
          permissions: expect.arrayContaining([]),
        })
      );
    });

    test('Fails on missing action permission', async () => {
      const badRequest = jest.fn();

      const ctx = createContext(
        {
          params: { id: 1 },
          body: {
            permissions: [{}],
          },
        },
        { badRequest }
      );
      global.strapi = {
        admin: {
          services: {
            role: { getSuperAdmin: jest.fn(() => undefined) },
            permission: { conditionProvider: { conditions: jest.fn(() => []) } },
          },
        },
      };

      await roleController.updatePermissions(ctx);

      expect(badRequest).toHaveBeenCalledWith(
        'ValidationError',
        expect.objectContaining({
          'permissions[0].action': expect.arrayContaining([
            'permissions[0].action is a required field',
          ]),
        })
      );
    });

    test('Assign permissions if input is valid', async () => {
      const roleID = 1;
      const findOneRole = jest.fn(() => Promise.resolve({ id: roleID }));
      const assignPermissions = jest.fn((roleID, permissions) => Promise.resolve(permissions));
      const inputPermissions = [
        {
          action: 'test',
          subject: 'model1',
          fields: ['title'],
          conditions: ['someCondition'],
        },
      ];

      const ctx = createContext({
        params: { id: roleID },
        body: {
          permissions: inputPermissions,
        },
      });

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne: findOneRole,
              getSuperAdmin: jest.fn(() => undefined),
            },
            permission: {
              assign: assignPermissions,
              conditionProvider: {
                conditions: jest.fn(() => ['someCondition']),
              },
              actionProvider: {
                getAllByMap: jest.fn(),
              },
            },
          },
        },
      };

      await roleController.updatePermissions(ctx);

      expect(findOneRole).toHaveBeenCalledWith({ id: roleID });
      expect(assignPermissions).toHaveBeenCalledWith(roleID, inputPermissions);

      expect(ctx.body).toEqual({
        data: inputPermissions,
      });
    });
  });
});
