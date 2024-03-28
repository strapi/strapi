import { errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import userController from '../user';

describe('User Controller', () => {
  describe('Create User', () => {
    const body = {
      firstname: 'Kai',
      lastname: 'Doe',
      email: 'kaidoe@email.com',
      roles: [1, 2],
    };

    test('Fails if user already exist', async () => {
      const exists = jest.fn(() => Promise.resolve(true));
      const ctx = createContext({ body }) as any;

      global.strapi = {
        admin: {
          services: {
            user: {
              exists,
            },
          },
        },
      } as any;

      expect.assertions(3);

      try {
        await userController.create(ctx);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('Email already taken');
      }

      expect(exists).toHaveBeenCalledWith({ email: body.email });
    });

    test('Create User Successfully', async () => {
      const create = jest.fn(() => Promise.resolve(body));
      const exists = jest.fn(() => Promise.resolve(false));
      const sanitizeUser = jest.fn((user) => Promise.resolve(user));
      const created = jest.fn();
      const ctx = createContext({ body }, { created }) as any;

      global.strapi = {
        admin: {
          services: {
            user: {
              exists,
              create,
              sanitizeUser,
            },
          },
        },
      } as any;

      await userController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ email: body.email });
      expect(create).toHaveBeenCalledWith(body);
      expect(sanitizeUser).toHaveBeenCalled();
      expect(created).toHaveBeenCalled();
    });

    test('Create User Successfully with camelCase email', async () => {
      const camelCaseBody = { ...body, email: 'kAiDoE@CamelCaSE.com' };
      const create = jest.fn(() => Promise.resolve(camelCaseBody));
      const exists = jest.fn(() => Promise.resolve(false));
      const sanitizeUser = jest.fn((user) => Promise.resolve(user));
      const created = jest.fn();
      const ctx = createContext({ body: camelCaseBody }, { created }) as any;

      global.strapi = {
        admin: {
          services: {
            user: {
              exists,
              create,
              sanitizeUser,
            },
          },
        },
      } as any;

      await userController.create(ctx);

      const lowerEmail = camelCaseBody.email.toLowerCase();
      expect(exists).toHaveBeenCalledWith({ email: lowerEmail });
      expect(create).toHaveBeenCalledWith({
        ...camelCaseBody,
        email: lowerEmail,
      });
      expect(sanitizeUser).toHaveBeenCalled();
      expect(created).toHaveBeenCalled();
    });
  });

  describe('Find a user by its ID', () => {
    const user = {
      id: 1,
      firstname: 'Kai',
      lastname: 'Doe',
      email: 'kaidoe@email.com',
      roles: [1, 2],
    };

    test('Find a user correctly', async () => {
      const findOne = jest.fn(() => user);
      const sanitizeUser = jest.fn((user) => user);
      const ctx = createContext({ params: { id: user.id } }) as any;

      global.strapi = {
        admin: {
          services: {
            user: { findOne, sanitizeUser },
          },
        },
      } as any;

      await userController.findOne(ctx);

      expect(findOne).toHaveBeenCalledWith(user.id);
      expect(sanitizeUser).toHaveBeenCalledWith(user);
      expect(ctx.body).toStrictEqual({ data: user });
    });

    test('User not found', async () => {
      const fakeId = 42;
      const notFound = jest.fn();
      const findOne = jest.fn(() => Promise.resolve(null));
      const ctx = createContext({ params: { id: fakeId } }, { notFound }) as any;

      global.strapi = {
        admin: {
          services: {
            user: { findOne },
          },
        },
      } as any;

      await userController.findOne(ctx);

      expect(findOne).toHaveBeenCalledWith(fakeId);
      expect(notFound).toHaveBeenCalledWith('User does not exist');
    });
  });

  describe('Find users', () => {
    const users = [
      {
        id: 1,
        firstname: 'Kai',
        lastname: 'Doe',
        email: 'kaidoe@email.com',
        roles: [1, 2],
      },
      {
        id: 2,
        firstname: 'Doe',
        lastname: 'Kai',
        email: 'doekai@email.com',
        roles: [3],
      },
    ];

    test('Find all users', async () => {
      const pagination = { page: 1, pageSize: 5, pageCount: 1, total: 2 };
      const findPage = jest.fn(() => ({
        results: users,
        pagination,
      }));

      const state = {
        userAbility: {
          can: jest.fn(),
          cannot: jest.fn(() => false),
        },
      };

      const sanitizeUser = jest.fn((user) => user);
      const ctx = createContext({}) as any;
      ctx.state = state;

      const createPermissionsManager = jest.fn(() => ({
        ability: state.userAbility,
        sanitizeQuery: (query: any) => query,
        validateQuery() {},
      }));

      global.strapi = {
        admin: {
          services: {
            user: { findPage, sanitizeUser },
            permission: {
              createPermissionsManager,
            },
          },
        },
      } as any;

      await userController.find(ctx);

      expect(findPage).toHaveBeenCalled();
      expect(sanitizeUser).toHaveBeenCalledTimes(2);
      expect(ctx.body).toStrictEqual({ data: { results: users, pagination } });
    });

    test('Search all users', async () => {
      const pagination = { page: 1, pageSize: 5, pageCount: 1, total: 2 };
      const findPage = jest.fn(() => ({
        results: users,
        pagination,
      }));

      const state = {
        userAbility: {
          can: jest.fn(),
          cannot: jest.fn(() => false),
        },
      };

      const sanitizeUser = jest.fn((user) => user);
      const ctx = createContext({ query: { _q: 'foo' } }) as any;

      ctx.state = state;

      const createPermissionsManager = jest.fn(() => ({
        ability: state.userAbility,
        sanitizeQuery: (query: any) => query,
        validateQuery() {},
      }));

      global.strapi = {
        admin: {
          services: {
            user: { findPage, sanitizeUser },
            permission: {
              createPermissionsManager,
            },
          },
        },
      } as any;

      await userController.find(ctx);

      expect(findPage).toHaveBeenCalled();
      expect(sanitizeUser).toHaveBeenCalledTimes(2);
      expect(ctx.body).toStrictEqual({ data: { results: users, pagination } });
    });
  });

  describe('Update user', () => {
    const user = {
      id: 1,
      firstname: 'Kai',
      lastname: 'Doe',
      email: 'kaidoe@email.com',
      roles: [1, 2],
    };

    test('User not found', async () => {
      const fakeId = 42;
      const updateById = jest.fn(() => null);
      const notFound = jest.fn();
      const body = { username: 'Foo' };

      const ctx = createContext({ params: { id: fakeId }, body }, { notFound }) as any;

      global.strapi = {
        admin: {
          services: {
            user: { updateById },
          },
        },
      } as any;

      await userController.update(ctx);

      expect(updateById).toHaveReturnedWith(null);
      expect(notFound).toHaveBeenCalledWith('User does not exist');
    });

    test('Validation error', async () => {
      const body = { firstname: 21 };

      const ctx = createContext({ params: { id: user.id }, body }) as any;

      expect.assertions(2);

      try {
        await userController.update(ctx);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual(
          'firstname must be a `string` type, but the final value was: `21`.'
        );
      }
    });

    test('Update a user correctly', async () => {
      const updateById = jest.fn((_, input) => ({ ...user, ...input }));
      const sanitizeUser = jest.fn((user) => user);
      const body = { firstname: 'Foo' };

      const ctx = createContext({ params: { id: user.id }, body }) as any;

      global.strapi = {
        admin: {
          services: {
            user: { updateById, sanitizeUser },
          },
        },
      } as any;

      await userController.update(ctx);

      expect(updateById).toHaveBeenCalledWith(user.id, body);
      expect(sanitizeUser).toHaveBeenCalled();
      expect(ctx.body).toStrictEqual({ data: { ...user, ...body } });
    });
  });
});
