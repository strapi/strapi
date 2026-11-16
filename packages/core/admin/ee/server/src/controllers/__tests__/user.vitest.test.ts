import { describe, test, expect, vi } from 'vitest';
import userController from '../user';

describe('EE user controller', () => {
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
  });
});
