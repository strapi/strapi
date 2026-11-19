import { describe, test, expect, vi } from 'vitest';
import type { Context } from 'koa';

import userController from '../user';

/**
 * EE user controller: with a licensed seat count, creating a user or activating an inactive one is
 * refused once the active users fill every seat.
 */

const setup = ({ seats, activeUsers }: { seats: number | null; activeUsers: number }) => {
  const userService = {
    getCurrentActiveUserCount: vi.fn(async () => activeUsers),
    exists: vi.fn(async () => false),
    findOne: vi.fn(async (id: string) => ({ id, isActive: false })),
    updateById: vi.fn(async (id: string, data: object) => ({ id, ...data, password: 'hash' })),
    sanitizeUser: vi.fn(({ password: _, ...user }: { password?: string }) => user),
    create: vi.fn(),
  };

  global.strapi = {
    EE: true,
    ee: { seats, features: { isEnabled: () => false } },
    admin: { services: { user: userService } },
  } as any;

  return { userService };
};

const createCtx = ({ params = {}, body = {} }: { params?: object; body?: object }) =>
  ({ params, request: { body }, notFound: vi.fn() }) as unknown as Context;

describe('EE user controller', () => {
  describe('create', () => {
    test('refuses a new user when the active users fill every seat', async () => {
      const { userService } = setup({ seats: 2, activeUsers: 2 });

      await expect(
        userController.create(createCtx({ body: { email: 'new@strapi.io' } }))
      ).rejects.toThrow('License seat limit reached. You cannot create a new user');
      expect(userService.getCurrentActiveUserCount).toHaveBeenCalled();
      expect(userService.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('answers 404 for a missing user when no seat is left', async () => {
      const findOne = vi.fn(() => Promise.resolve(null));
      const updateById = vi.fn();
      const notFound = vi.fn();

      global.strapi = {
        EE: true,
        ee: { seats: 1 },
        admin: {
          services: {
            user: {
              findOne,
              updateById,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(1)),
            },
          },
        },
      } as any;

      const ctx = { params: { id: 404 }, request: { body: { isActive: true } }, notFound } as any;

      await userController.update(ctx);

      expect(findOne).toHaveBeenCalledWith(404, null);
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
              findOne: vi.fn(() => Promise.resolve({ id: 2, isActive: false })),
              updateById,
              getCurrentActiveUserCount: vi.fn(() => Promise.resolve(1)),
            },
          },
        },
      } as any;

      const ctx = { params: { id: 2 }, request: { body: { isActive: true } } } as any;

      await expect(userController.update(ctx)).rejects.toThrowError(
        'License seat limit reached. You cannot active this user'
      );
      expect(updateById).not.toHaveBeenCalled();
    });

    test('refuses to activate an inactive user when the active users fill every seat', async () => {
      const { userService } = setup({ seats: 2, activeUsers: 2 });

      await expect(
        userController.update(createCtx({ params: { id: '3' }, body: { isActive: true } }))
      ).rejects.toThrow('License seat limit reached. You cannot active this user');
      expect(userService.findOne).toHaveBeenCalledWith('3', null);
      expect(userService.updateById).not.toHaveBeenCalled();
    });

    test('activates an inactive user while a seat is available', async () => {
      const { userService } = setup({ seats: 2, activeUsers: 1 });
      const ctx = createCtx({ params: { id: '3' }, body: { isActive: true } });

      await userController.update(ctx);

      expect(userService.updateById).toHaveBeenCalledWith('3', { isActive: true });
      expect(ctx.body).toEqual({ data: { id: '3', isActive: true } });
    });

    test('activates an inactive user without a licensed seat count', async () => {
      const { userService } = setup({ seats: null, activeUsers: 10 });

      await userController.update(createCtx({ params: { id: '3' }, body: { isActive: true } }));

      expect(userService.getCurrentActiveUserCount).not.toHaveBeenCalled();
      expect(userService.updateById).toHaveBeenCalled();
    });
  });
});
