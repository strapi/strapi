import _ from 'lodash';
import { errors, queryParams } from '@strapi/utils';
import constants from '../constants';
import userService from '../user';
import userContentType from '../../content-types/User';

const { SUPER_ADMIN_CODE } = constants;

const {
  create,
  updateById,
  exists,
  findRegistrationInfo,
  register,
  sanitizeUser,
  findOne,
  findPage,
  deleteById,
  deleteByIds,
  count,
  displayWarningIfUsersDontHaveRole,
  resetPasswordByEmail,
  getLanguagesInUse,
} = userService;

describe('User', () => {
  global.strapi = {
    getModel: jest.fn(() => userContentType),
    get(name: string) {
      if (name === 'query-params') {
        const transformer = queryParams.createTransformer({
          getModel(name: string) {
            return strapi.getModel(name as any);
          },
        });

        return {
          transform: transformer.transformQueryParams,
        };
      }
    },
  } as any;

  describe('sanitizeUser', () => {
    test('Removes password and resetPasswordToken', () => {
      const res = sanitizeUser({
        id: 1,
        firstname: 'Test',
        otherField: 'Hello',
        password: '$5IAZUDB871',
        resetPasswordToken: '3456-5678-6789-789',
        roles: [],
      } as any);

      expect(res).toEqual({
        id: 1,
        firstname: 'Test',
        otherField: 'Hello',
        roles: [],
      });
    });
  });

  describe('create', () => {
    const count = jest.fn(() => Promise.resolve(1));
    const sendDidInviteUser = jest.fn();

    test('Creates a user by merging given and default attributes', async () => {
      const dbCreate = jest.fn(({ data }) => Promise.resolve(data));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
            role: { count },
            metrics: { sendDidInviteUser },
          },
        },
        db: {
          query() {
            return { create: dbCreate, count };
          },
        },
      } as any;

      const input = { firstname: 'Kai', lastname: 'Doe', email: 'kaidoe@email.com' };
      const expected = { ...input, isActive: false, roles: [], registrationToken: 'token' };

      const result = await create(input);

      expect(dbCreate).toHaveBeenCalled();
      expect(createToken).toHaveBeenCalled();
      expect(result).toMatchObject(expected);
    });

    test('Creates a user and hash password if provided', async () => {
      const dbCreate = jest.fn(({ data }) => Promise.resolve(data));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
            role: { count },
            metrics: { sendDidInviteUser },
          },
        },
        db: {
          query() {
            return { create: dbCreate, count };
          },
        },
      } as any;

      const input = {
        firstname: 'Kai',
        lastname: 'Doe',
        email: 'kaidoe@email.com',
        password: 'Pcw123',
      };
      const expected = {
        ...input,
        password: expect.any(String),
        isActive: false,
        roles: [],
        registrationToken: 'token',
      };

      const result = await create(input);

      expect(dbCreate).toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(createToken).toHaveBeenCalled();
      expect(result).toMatchObject(expected);
      expect(result.password !== input.password).toBe(true);
    });

    test('Creates a user by using given attributes', async () => {
      const dbCreate = jest.fn(({ data }) => Promise.resolve(data));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
            role: { count },
            metrics: { sendDidInviteUser },
          },
        },
        db: {
          query() {
            return { create: dbCreate, count };
          },
        },
      } as any;

      const input = {
        firstname: 'Kai',
        lastname: 'Doe',
        email: 'kaidoe@email.com',
        roles: [2],
        isActive: true,
        registrationToken: 'another-token',
      };
      const expected = _.clone(input);
      // @ts-expect-error - test purpose
      const result = await create(input);

      expect(result).toMatchObject(expected);
    });
  });

  describe('Count users', () => {
    test('Count users without params', async () => {
      const dbCount = jest.fn(() => Promise.resolve(2));
      global.strapi = {
        ...global.strapi,
        db: { query: () => ({ count: dbCount }) },
      } as any;

      const amount = await count();

      expect(amount).toBe(2);
      expect(dbCount).toHaveBeenCalledWith({ where: {} });
    });

    test('Count users with params', async () => {
      const dbCount = jest.fn(() => Promise.resolve(2));
      global.strapi = {
        ...global.strapi,
        db: { query: () => ({ count: dbCount }) },
      } as any;

      const params = { foo: 'bar' };
      const amount = await count(params);

      expect(amount).toBe(2);
      expect(dbCount).toHaveBeenCalledWith({ where: params });
    });
  });

  describe('update', () => {
    test('Hash password', async () => {
      const hash = 'aoizdnoaizndoainzodiaz';

      const id = 1;
      const input = { email: 'test@strapi.io', password: '123' };

      const findOne = jest.fn((_, user) => Promise.resolve(user));
      const update = jest.fn(({ data }) => Promise.resolve(data));
      const hashPassword = jest.fn(() => Promise.resolve(hash));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: {
          query() {
            return { update, findOne };
          },
        },
        admin: {
          services: {
            auth: { hashPassword },
          },
        },
      } as any;

      const result = await updateById(id, input);

      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(update).toHaveBeenCalledWith({
        where: { id },
        data: { email: input.email, password: hash },
        populate: ['roles'],
      });

      expect(result).toEqual({
        email: 'test@strapi.io',
        password: 'aoizdnoaizndoainzodiaz',
      });
    });

    test('Forwards call to the query layer', async () => {
      const user = {
        email: 'test@strapi.io',
      };

      const findOne = jest.fn(() => Promise.resolve(user));
      const update = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: {
          query() {
            return { update, findOne };
          },
        },
      } as any;
      const id = 1;
      const input = { email: 'test@strapi.io' };
      const result = await updateById(id, input);

      expect(update).toHaveBeenCalledWith({ where: { id }, data: input, populate: ['roles'] });
      expect(result).toBe(user);
    });

    test('Call the update function with the expected params', async () => {
      const email = 'email@email.fr';
      const password = 'Testing1234';
      const hash = 'hash';
      const userId = 1;

      const findOne = jest.fn(() => ({ id: userId }));
      const update = jest.fn(() => ({
        roles: [
          {
            id: 3,
            name: 'Author',
            description: 'Authors can manage the content they have created.',
            code: 'strapi-author',
          },
        ],
      }));
      const hashPassword = jest.fn(() => hash);

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: {
          query() {
            return {
              findOne,
              update,
            };
          },
        },
        admin: {
          services: {
            auth: {
              hashPassword,
            },
          },
        },
      } as any;

      await resetPasswordByEmail(email, password);
      expect(findOne).toHaveBeenCalledWith({ where: { email }, populate: ['roles'] });
      expect(update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hash },
        populate: ['roles'],
      });
      expect(hashPassword).toHaveBeenCalledWith(password);
    });
  });

  describe('updateById', () => {
    test('Cannot delete last super admin', async () => {
      const findOne = jest.fn(() =>
        Promise.resolve({ id: 11, roles: [{ code: SUPER_ADMIN_CODE }] })
      );

      const getSuperAdminWithUsersCount = jest.fn(() => Promise.resolve({ id: 1, usersCount: 1 }));

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: { query: () => ({ findOne }) },
        admin: { services: { role: { getSuperAdminWithUsersCount } } },
      } as any;

      expect.assertions(2);

      try {
        await deleteById(2);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('You must have at least one user with super admin role.');
      }
    });

    test('Can delete a super admin if they are not the last one', async () => {
      const user = { id: 2, roles: [{ code: SUPER_ADMIN_CODE }] };
      const findOne = jest.fn(() => Promise.resolve(user));
      const getSuperAdminWithUsersCount = jest.fn(() => Promise.resolve({ id: 1, usersCount: 2 }));
      const deleteFn = jest.fn(() => user);

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: { query: () => ({ findOne, delete: deleteFn }) },
        admin: { services: { role: { getSuperAdminWithUsersCount } } },
      } as any;

      const res = await deleteById(user.id);

      expect(deleteFn).toHaveBeenCalledWith({ where: { id: user.id }, populate: ['roles'] });
      expect(res).toEqual(user);
    });
  });

  describe('deleteByIds', () => {
    test('Cannot delete last super admin', async () => {
      const count = jest.fn(() => Promise.resolve(2));
      const getSuperAdminWithUsersCount = jest.fn(() => Promise.resolve({ id: 1, usersCount: 2 }));
      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: { query: () => ({ count }) },
        admin: { services: { role: { getSuperAdminWithUsersCount } } },
      } as any;

      expect.assertions(2);

      try {
        await deleteByIds([2, 3]);
      } catch (e: any) {
        expect(e instanceof errors.ApplicationError).toBe(true);
        expect(e.message).toEqual('You must have at least one user with super admin role.');
      }
    });

    test('Can delete a super admin if they are not the last one', async () => {
      const users = [{ id: 2 }, { id: 3 }];
      const count = jest.fn(() => Promise.resolve(users.length));
      const getSuperAdminWithUsersCount = jest.fn(() => Promise.resolve({ id: 1, usersCount: 3 }));
      const deleteFn = jest
        .fn()
        .mockImplementationOnce(() => users[0])
        .mockImplementationOnce(() => users[1]);

      global.strapi = {
        ...global.strapi,
        eventHub: {
          emit: jest.fn(),
        },
        db: { query: () => ({ count, delete: deleteFn }) },
        admin: { services: { role: { getSuperAdminWithUsersCount } } },
      } as any;

      const res = await deleteByIds([2, 3]);

      expect(deleteFn).toHaveBeenNthCalledWith(1, { where: { id: 2 }, populate: ['roles'] });
      expect(deleteFn).toHaveBeenNthCalledWith(2, { where: { id: 3 }, populate: ['roles'] });

      expect(res).toEqual(users);
    });
  });

  describe('exists', () => {
    test('Return true if the user already exists', async () => {
      const count = jest.fn(() => Promise.resolve(1));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { count };
          },
        },
      } as any;

      const result = await exists();

      expect(result).toBeTruthy();
    });

    test('Return false if the user does not exists', async () => {
      const count = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { count };
          },
        },
      } as any;

      const result = await exists();

      expect(result).toBeFalsy();
    });
  });

  describe('Fetch users (paginated)', () => {
    const defaults = { page: 1, pageSize: 100 };

    beforeEach(() => {
      const findPage = jest.fn(({ page = defaults.page, pageSize = defaults.pageSize } = {}) => {
        return {
          results: Array.from({ length: pageSize }).map((_, i) => i + (page - 1) * pageSize),
          pagination: { page, pageSize, total: page * pageSize, pageCount: page },
        };
      });

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { findPage };
          },
        },
      } as any;
    });

    test('Fetch users with custom pagination', async () => {
      const pagination = { page: 2, pageSize: 15 };
      const foundPage = (await findPage(pagination)) as any;

      expect(foundPage.results.length).toBe(15);
      expect(foundPage.results[0]).toBe(15);
      expect((foundPage.pagination.total = 30));
    });

    test('Fetch users with default pagination', async () => {
      const foundPage = (await findPage()) as any;

      expect(foundPage.results.length).toBe(100);
      expect(foundPage.results[0]).toBe(0);
      expect((foundPage.pagination.total = 100));
    });

    test('Fetch users with partial pagination', async () => {
      const pagination = { page: 2 };
      const foundPage = (await findPage(pagination)) as any;

      expect(foundPage.results.length).toBe(100);
      expect(foundPage.results[0]).toBe(100);
      expect((foundPage.pagination.total = 200));
    });
  });

  describe('Fetch user', () => {
    const user = { firstname: 'Kai', lastname: 'Doe', email: 'kaidoe@email.com' };

    beforeEach(() => {
      const userMap: Record<number, typeof user> = {
        1: user,
      };

      const findOne = jest.fn((query: { where: { id: number } }): any => {
        return userMap[query.where.id] ?? null;
      });

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;
    });

    test('Finds and returns a user by its ID', async () => {
      const id = 1;
      const res = await findOne(id);

      expect(res).not.toBeNull();
      expect(res).toMatchObject(user);
    });

    test('Fails to find a user with provided params', async () => {
      const id = 27;
      const res = await findOne(id);

      expect(res).toBeNull();
    });

    test('Using findOneByEmail should make a case insensitive lookup', async () => {
      const findOne = jest.fn();
      const fakeEmail = 'admin@admin.com';

      global.strapi = {
        ...global.strapi,
        db: {
          query: () => ({ findOne }),
        },
      } as any;

      await userService.findOneByEmail(fakeEmail);

      expect(findOne).toHaveBeenCalledWith({
        where: { email: { $eqi: fakeEmail } },
        //                  ^ Case Insensitive $eq
        populate: [],
      });
    });
  });

  describe('findRegistrationInfo', () => {
    test('Returns undefined if not found', async () => {
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await findRegistrationInfo('ABCD');
      expect(res).toBeUndefined();
      expect(findOne).toHaveBeenCalledWith({ where: { registrationToken: 'ABCD' } });
    });

    test('Returns correct user registration info', async () => {
      const user = {
        email: 'test@strapi.io',
        firstname: 'Test',
        lastname: 'Strapi',
        otherField: 'ignored',
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return { findOne };
          },
        },
      } as any;

      const res = await findRegistrationInfo('ABCD');

      expect(res).toEqual({
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
      });
    });
  });

  describe('register', () => {
    test('Fails if no matching user is found', async () => {
      const findOne = jest.fn(() => Promise.resolve(undefined));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findOne,
            };
          },
        },
      } as any;

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      expect(register(input)).rejects.toThrowError('Invalid registration info');
    });

    test('Calls udpate service', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const updateById = jest.fn((user) => Promise.resolve(user));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findOne,
            };
          },
        },
        admin: {
          services: {
            user: { updateById },
          },
        },
      } as any;

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await register(input);

      expect(updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ firstname: 'test', lastname: 'Strapi', password: 'Test1234' })
      );
    });

    test('Set user to active', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const updateById = jest.fn((user) => Promise.resolve(user));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findOne,
            };
          },
        },
        admin: {
          services: {
            user: { updateById },
          },
        },
      } as any;

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await register(input);

      expect(updateById).toHaveBeenCalledWith(1, expect.objectContaining({ isActive: true }));
    });

    test('Reset registrationToken', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const updateById = jest.fn((user) => Promise.resolve(user));

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findOne,
            };
          },
        },
        admin: {
          services: {
            user: { updateById },
          },
        },
      } as any;

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await register(input);

      expect(updateById).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ registrationToken: null })
      );
    });
  });

  test.todo('Assign a role to all');

  describe('displayWarningIfUsersDontHaveRole', () => {
    test('All users have at least one role', async () => {
      const count = jest.fn(() => Promise.resolve(0));
      const warn = jest.fn();

      global.strapi = {
        ...global.strapi,
        db: { query: () => ({ model: { orm: 'bookshelf' }, count }) },
        log: { warn },
      } as any;

      await displayWarningIfUsersDontHaveRole();

      expect(warn).toHaveBeenCalledTimes(0);
    });

    test('2 users have 0 roles', async () => {
      const count = jest.fn(() => Promise.resolve(2));
      const warn = jest.fn();

      global.strapi = {
        ...global.strapi,
        db: { query: () => ({ model: { orm: 'bookshelf' }, count }) },
        log: { warn },
      } as any;

      await displayWarningIfUsersDontHaveRole();

      expect(warn).toHaveBeenCalledWith("Some users (2) don't have any role.");
    });
  });

  describe('resetPasswordByEmail', () => {
    test('Throws on missing user', async () => {
      const email = 'email@email.fr';
      const password = 'invalidpass';

      const findOne = jest.fn(() => {
        return null;
      });

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findOne,
            };
          },
        },
      } as any;

      await expect(resetPasswordByEmail(email, password)).rejects.toEqual(
        new Error(`User not found for email: ${email}`)
      );

      expect(findOne).toHaveBeenCalledWith({ where: { email }, populate: ['roles'] });
    });

    test.each(['abc', 'Abcd', 'Abcdefgh', 'Abcd123'])(
      'Throws on invalid password',
      async (password) => {
        const email = 'email@email.fr';

        const findOne = jest.fn(() => ({ id: 1 }));

        global.strapi = {
          ...global.strapi,
          db: {
            query() {
              return {
                findOne,
              };
            },
          },
        } as any;

        await expect(resetPasswordByEmail(email, password)).rejects.toEqual(
          new Error(
            'Invalid password. Expected a minimum of 8 characters with at least one number and one uppercase letter'
          )
        );

        expect(findOne).toHaveBeenCalledWith({ where: { email }, populate: ['roles'] });
      }
    );
  });

  describe('getLanguagesInUse', () => {
    test('Returns array of language codes', () => {
      const findMany = jest.fn(() =>
        Promise.resolve([
          {
            id: 1,
            preferedLanguage: 'en',
          },
          {
            id: 2,
            preferedLanguage: 'fr',
          },
          {
            id: 3,
            preferedLanguage: 'en',
          },
        ])
      );

      global.strapi = {
        ...global.strapi,
        db: {
          query() {
            return {
              findMany,
            };
          },
        },
      } as any;

      expect(getLanguagesInUse()).resolves.toEqual(['en', 'fr', 'en']);
    });
  });
});
