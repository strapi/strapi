import { describe, test, expect, vi } from 'vitest';
import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import roleController from '../role';

describe('Role controller', () => {
  describe('getPermissions', () => {
    test('Fails if role does not exist', async () => {
      const findOne = vi.fn(() => Promise.resolve());
      const notFound = vi.fn();

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

      const findOneRole = vi.fn(() => Promise.resolve({ id: 1 }));
      const findPermissions = vi.fn(() => Promise.resolve(permissions));
      const sanitizePermission = vi.fn((perms) => perms);

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
      const findOne = vi.fn(() => Promise.resolve({ id: 1 }));

      const ctx = createContext({
        params: { id: 1 },
        body: {},
      }) as any;

      global.strapi = {
        admin: {
          services: {
            permission: {
              sanitizePermission: vi.fn((p) => p),
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
      const findOne = vi.fn(() => Promise.resolve({ id: 1 }));

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
              sanitizePermission: vi.fn((p) => p),
              actionProvider: { get: vi.fn() },
              conditionProvider: { values: vi.fn(() => []) },
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
      const findOneRole = vi.fn(() => Promise.resolve({ id: roleID }));
      const assignPermissions = vi.fn((roleID, permissions) => Promise.resolve(permissions));
      const willValidateUpdatePermissions = vi.fn((permissions) => Promise.resolve(permissions));
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
              getSuperAdmin: vi.fn(() => undefined),
              hooks: {
                willValidateUpdatePermissions: {
                  call: willValidateUpdatePermissions,
                },
              },
            },
            permission: {
              sanitizePermission: vi.fn((permissions) => permissions),
              conditionProvider: {
                values: vi.fn(() => [{ id: 'admin::is-creator' }]),
              },
              actionProvider: {
                values: vi.fn(() => [{ actionId: 'test', subjects: ['model1'] }]),
                get: vi.fn(() => ({
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
      expect(willValidateUpdatePermissions).toHaveBeenCalledWith(inputPermissions);
      expect(assignPermissions).toHaveBeenCalledWith(roleID, inputPermissions);

      expect(ctx.body).toEqual({
        data: inputPermissions,
      });
    });

    test('Assigns permissions returned by willValidateUpdatePermissions', async () => {
      const roleID = 1;
      const findOneRole = vi.fn(() => Promise.resolve({ id: roleID }));
      const assignPermissions = vi.fn((roleID, permissions) => Promise.resolve(permissions));
      const inputPermissions = [
        {
          action: 'plugin::content-manager.explorer.read',
          subject: 'api::article.article',
          properties: { fields: ['title'], locales: [] },
          conditions: [],
        },
      ];
      const normalizedPermissions = [
        {
          ...inputPermissions[0],
          properties: { fields: ['title'], locales: ['en'] },
        },
      ];
      const willValidateUpdatePermissions = vi.fn(() => Promise.resolve(normalizedPermissions));

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
              getSuperAdmin: vi.fn(() => undefined),
              hooks: {
                willValidateUpdatePermissions: {
                  call: willValidateUpdatePermissions,
                },
              },
            },
            permission: {
              sanitizePermission: vi.fn((permissions) => permissions),
              conditionProvider: {
                values: vi.fn(() => []),
              },
              actionProvider: {
                values: vi.fn(() => [
                  {
                    actionId: 'plugin::content-manager.explorer.read',
                    subjects: ['api::article.article'],
                  },
                ]),
                get: vi.fn(() => ({
                  actionId: 'plugin::content-manager.explorer.read',
                  subjects: ['api::article.article'],
                  options: { applyToProperties: ['fields', 'locales'] },
                })),
              },
            },
          },
        },
      } as any;

      await roleController.updatePermissions(ctx);

      expect(willValidateUpdatePermissions).toHaveBeenCalledWith(inputPermissions);
      expect(assignPermissions).toHaveBeenCalledWith(roleID, normalizedPermissions);
      expect(ctx.body).toEqual({
        data: normalizedPermissions,
      });
    });
  });
});
