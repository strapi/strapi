import { describe, test, expect, vi } from 'vitest';
import formExtensionsService from '../../../../../server/src/services/form-extensions';
import userController from '../user';

describe('EE user controller', () => {
  describe('create', () => {
    test('checks the seats again after the plugin steps', async () => {
      let activeUsers = 0;
      const create = vi.fn();
      const formExtensions = formExtensionsService();
      formExtensions.unstable_addInputParams('user', {
        spaces: {
          // Another request activates a user while a plugin step waits
          beforeSave({ data }) {
            activeUsers += 1;

            return data;
          },
        },
      });

      global.strapi = {
        EE: true,
        ee: { seats: 1, features: { isEnabled: () => false } },
        admin: {
          services: {
            'form-extensions': formExtensions,
            user: {
              exists: vi.fn(() => Promise.resolve(false)),
              create,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(activeUsers)),
            },
          },
        },
      } as any;

      const ctx = {
        state: {},
        request: { body: { firstname: 'Ana', email: 'ana@example.com', roles: [1] } },
      } as any;

      await expect(userController.create(ctx)).rejects.toThrowError(
        'License seat limit reached. You cannot create a new user'
      );
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('answers 404 for a missing user when no seat is left', async () => {
      const exists = vi.fn(() => Promise.resolve(false));
      const updateById = vi.fn();
      const notFound = vi.fn();

      global.strapi = {
        EE: true,
        ee: { seats: 1 },
        admin: {
          services: {
            user: {
              exists,
              updateById,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(1)),
            },
          },
        },
      } as any;

      const ctx = {
        params: { id: 404 },
        request: { body: { isActive: true } },
        state: {},
        notFound,
      } as any;

      await userController.update(ctx);

      expect(exists).toHaveBeenCalledWith({ id: 404 });
      expect(updateById).not.toHaveBeenCalled();
      expect(notFound).toHaveBeenCalledWith('User does not exist');
    });

    test('still refuses to activate an existing user when no seat is left', async () => {
      const updateById = vi.fn();

      global.strapi = {
        EE: true,
        ee: { seats: 1 },
        admin: {
          services: {
            user: {
              exists: vi.fn(() => Promise.resolve(true)),
              findOne: vi.fn(() => Promise.resolve({ id: 2, isActive: false })),
              updateById,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(1)),
            },
          },
        },
      } as any;

      const ctx = { params: { id: 2 }, state: {}, request: { body: { isActive: true } } } as any;

      await expect(userController.update(ctx)).rejects.toThrowError(
        'License seat limit reached. You cannot active this user'
      );
      expect(updateById).not.toHaveBeenCalled();
    });

    test('checks the seats on the user as it is after the plugin steps', async () => {
      const stored = { id: 2, isActive: true };
      const updateById = vi.fn();
      const formExtensions = formExtensionsService();
      formExtensions.unstable_addInputParams('user', {
        spaces: {
          // Another request deactivates the user while a plugin step waits
          beforeSave({ data }) {
            stored.isActive = false;

            return data;
          },
        },
      });

      global.strapi = {
        EE: true,
        ee: { seats: 1 },
        admin: {
          services: {
            'form-extensions': formExtensions,
            user: {
              exists: vi.fn(() => Promise.resolve(true)),
              findOne: vi.fn(() => Promise.resolve({ ...stored })),
              updateById,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(1)),
            },
          },
        },
      } as any;

      const ctx = { params: { id: 2 }, state: {}, request: { body: { isActive: true } } } as any;

      await expect(userController.update(ctx)).rejects.toThrowError(
        'Your license user limit is reached. You cannot activate this user.'
      );
      expect(updateById).not.toHaveBeenCalled();
    });
  });
});
