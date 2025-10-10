import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import roleController from '../role';

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
      ) as any;

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne,
            },
          },
        },
      } as any;

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
      const sanitizePermission = jest.fn((perms) => perms);

      const ctx = createContext({
        params: { id: 1 },
      }) as any;

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne: findOneRole,
            },
            permission: {
              findMany: findPermissions,
              sanitizePermission,
            },
          },
        },
      } as any;

      await roleController.getPermissions(ctx);

      expect(findOneRole).toHaveBeenCalledWith({ id: ctx.params.id });
      expect(findPermissions).toHaveBeenCalledWith({ where: { role: { id: ctx.params.id } } });
      expect(ctx.body).toEqual({
        data: permissions,
      });
    });
  });

  describe('updatePermissions', () => {
    test('Fails on missing permissions input', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));

      const ctx = createContext({
        params: { id: 1 },
        body: {},
      }) as any;

      global.strapi = {
        admin: {
          services: {
            permission: {
              sanitizePermission: jest.fn((p) => p),
            },
            role: {
              findOne,
            },
          },
        },
      } as any;

      expect.assertions(2);

      try {
        await roleController.updatePermissions(ctx);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('permissions is a required field');
      }
    });

    test('Fails on missing action permission', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));

      const ctx = createContext({
        params: { id: 1 },
        body: {
          permissions: [{}],
        },
      }) as any;

      global.strapi = {
        admin: {
          services: {
            role: { findOne },
            permission: {
              sanitizePermission: jest.fn((p) => p),
              actionProvider: { get: jest.fn() },
              conditionProvider: { values: jest.fn(() => []) },
            },
          },
        },
      } as any;

      expect.assertions(2);

      try {
        await roleController.updatePermissions(ctx);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('permissions[0].action is a required field');
      }
    });

    test('Assign permissions if input is valid', async () => {
      const roleID = 1;
      const findOneRole = jest.fn(() => Promise.resolve({ id: roleID }));
      const assignPermissions = jest.fn((roleID, permissions) => Promise.resolve(permissions));
      const inputPermissions = [
        {
          action: 'test',
          subject: 'model1',
          properties: { fields: ['title'] },
          conditions: ['admin::is-creator'],
        },
      ];

      const ctx = createContext({
        params: { id: roleID },
        body: {
          permissions: inputPermissions,
        },
      }) as any;

      global.strapi = {
        admin: {
          services: {
            role: {
              assignPermissions,
              findOne: findOneRole,
              getSuperAdmin: jest.fn(() => undefined),
            },
            permission: {
              sanitizePermission: jest.fn((permissions) => permissions),
              conditionProvider: {
                values: jest.fn(() => [{ id: 'admin::is-creator' }]),
              },
              actionProvider: {
                values: jest.fn(() => [{ actionId: 'test', subjects: ['model1'] }]),
                get: jest.fn(() => ({
                  actionId: 'test',
                  subjects: ['model1'],
                  options: { applyToProperties: ['fields'] },
                })),
              },
            },
          },
        },
      } as any;

      await roleController.updatePermissions(ctx);

      expect(findOneRole).toHaveBeenCalledWith({ id: roleID });
      expect(assignPermissions).toHaveBeenCalledWith(roleID, inputPermissions);

      expect(ctx.body).toEqual({
        data: inputPermissions,
      });
    });
  });
});
