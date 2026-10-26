import type { Context } from 'koa';

import userController from '../user';

/**
 * EE user controller: with a licensed seat count, creating a user or activating an inactive one is
 * refused once the active users fill every seat.
 */

const setup = ({ seats, activeUsers }: { seats: number | null; activeUsers: number }) => {
  const userService = {
    getCurrentActiveUserCount: jest.fn(async () => activeUsers),
    exists: jest.fn(async () => false),
    findOne: jest.fn(async (id: string) => ({ id, isActive: false })),
    updateById: jest.fn(async (id: string, data: object) => ({ id, ...data, password: 'hash' })),
    sanitizeUser: jest.fn(({ password: _, ...user }: { password?: string }) => user),
    create: jest.fn(),
  };

  global.strapi = {
    EE: true,
    ee: { seats, features: { isEnabled: () => false } },
    admin: { services: { user: userService } },
  } as any;

  return { userService };
};

const createCtx = ({ params = {}, body = {} }: { params?: object; body?: object }) =>
  ({ params, request: { body }, notFound: jest.fn() }) as unknown as Context;

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
