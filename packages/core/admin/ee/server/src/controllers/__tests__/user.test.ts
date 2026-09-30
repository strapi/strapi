import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../../tests/helpers/create-context';
import userController from '../user';

describe('EE user controller', () => {
  const body = {
    firstname: 'Kai',
    lastname: 'Doe',
    email: 'kaidoe@email.com',
    roles: [1],
  };

  const setup = ({
    seats,
    activeUserCount = 0,
    user = { id: 1, isActive: false },
  }: {
    seats?: number;
    activeUserCount?: number;
    user?: { id: number; isActive: boolean } | null;
  } = {}) => {
    const userService = {
      exists: jest.fn(() => Promise.resolve(false)),
      create: jest.fn((attributes) => Promise.resolve({ id: 1, ...attributes })),
      sanitizeUser: jest.fn((user) => user),
      findOne: jest.fn(() => Promise.resolve(user)),
      updateById: jest.fn(() => Promise.resolve({ id: 1, isActive: true })),
      getCurrentActiveUserCount: jest.fn(() => Promise.resolve(activeUserCount)),
    };

    global.strapi = {
      ee: {
        features: {
          isEnabled: jest.fn(() => false),
          get: jest.fn((name: string) =>
            name === 'seat-limit' && seats !== undefined ? { name, options: { seats } } : undefined
          ),
        },
      },
      admin: { services: { user: userService } },
    } as any;

    return userService;
  };

  describe('create', () => {
    test('keeps preferedLanguage', async () => {
      const { create } = setup();
      const ctx = createContext(
        { body: { ...body, preferedLanguage: 'fr' } },
        { created: jest.fn() }
      );

      await userController.create(ctx as any);

      expect(create).toHaveBeenCalledWith({ ...body, preferedLanguage: 'fr' });
    });

    test('does not count the active users without a seat limit', async () => {
      const { getCurrentActiveUserCount, create } = setup();
      const ctx = createContext({ body }, { created: jest.fn() });

      await userController.create(ctx as any);

      expect(getCurrentActiveUserCount).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalled();
    });

    test('rejects a new user when the seat limit is reached', async () => {
      const { create } = setup({ seats: 2, activeUserCount: 2 });
      const ctx = createContext({ body }, { created: jest.fn() });

      await expect(userController.create(ctx as any)).rejects.toThrow(errors.ForbiddenError);
      expect(create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    test('rejects activating a user when the seat limit is reached', async () => {
      const { updateById } = setup({ seats: 1, activeUserCount: 1 });
      const ctx = createContext({ params: { id: 1 }, body: { isActive: true } });

      await expect(userController.update(ctx as any)).rejects.toThrow(errors.ForbiddenError);
      expect(updateById).not.toHaveBeenCalled();
    });

    test('returns 404 for an unknown user when the seat limit is reached', async () => {
      const { updateById } = setup({ seats: 1, activeUserCount: 1, user: null });
      const notFound = jest.fn();
      const ctx = createContext({ params: { id: 42 }, body: { isActive: false } }, { notFound });

      await userController.update(ctx as any);

      expect(notFound).toHaveBeenCalledWith('User does not exist');
      expect(updateById).not.toHaveBeenCalled();
    });
  });
});
