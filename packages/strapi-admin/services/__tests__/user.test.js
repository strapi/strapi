'use strict';

const _ = require('lodash');
const userService = require('../user');

describe('User', () => {
  describe('sanitizeUser', () => {
    test('Removes password and resetPasswordToken', () => {
      const res = userService.sanitizeUser({
        id: 1,
        firstname: 'Test',
        otherField: 'Hello',
        password: '$5IAZUDB871',
        resetPasswordToken: '3456-5678-6789-789',
        roles: [],
      });

      expect(res).toEqual({
        id: 1,
        firstname: 'Test',
        otherField: 'Hello',
        roles: [],
      });
    });
  });

  describe('create', () => {
    test('Creates a user by merging given and default attributes', async () => {
      const create = jest.fn(user => Promise.resolve(user));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
          },
        },
        query() {
          return { create };
        },
      };

      const input = { firstname: 'John', lastname: 'Doe', email: 'johndoe@email.com' };
      const expected = { ...input, isActive: false, roles: [], registrationToken: 'token' };

      const result = await userService.create(input);

      expect(create).toHaveBeenCalled();
      expect(createToken).toHaveBeenCalled();
      expect(result).toStrictEqual(expected);
    });

    test('Creates a user and hash password if provided', async () => {
      const create = jest.fn(user => Promise.resolve(user));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
          },
        },
        query() {
          return { create };
        },
      };

      const input = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@email.com',
        password: 'Pcw123',
      };
      const expected = {
        ...input,
        password: expect.any(String),
        isActive: false,
        roles: [],
        registrationToken: 'token',
      };

      const result = await userService.create(input);

      expect(create).toHaveBeenCalled();
      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(createToken).toHaveBeenCalled();
      expect(result).toStrictEqual(expected);
      expect(result.password !== input.password).toBe(true);
    });

    test('Creates a user by using given attributes', async () => {
      const create = jest.fn(user => Promise.resolve(user));
      const createToken = jest.fn(() => 'token');
      const hashPassword = jest.fn(() => Promise.resolve('123456789'));

      global.strapi = {
        admin: {
          services: {
            token: { createToken },
            auth: { hashPassword },
          },
        },
        query() {
          return { create };
        },
      };

      const input = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@email.com',
        roles: [2],
        isActive: true,
        registrationToken: 'another-token',
      };
      const expected = _.clone(input);
      const result = await userService.create(input);

      expect(result).toStrictEqual(expected);
    });
  });

  describe('update', () => {
    test('Hash password', async () => {
      const hash = 'aoizdnoaizndoainzodiaz';

      const params = { id: 1 };
      const input = { email: 'test@strapi.io', password: '123' };

      const update = jest.fn((_, user) => Promise.resolve(user));
      const hashPassword = jest.fn(() => Promise.resolve(hash));

      global.strapi = {
        query() {
          return { update };
        },
        admin: {
          services: {
            auth: { hashPassword },
          },
        },
      };

      const result = await userService.update(params, input);

      expect(hashPassword).toHaveBeenCalledWith(input.password);
      expect(update).toHaveBeenCalledWith(params, { email: input.email, password: hash });
      expect(result).toEqual({
        email: 'test@strapi.io',
        password: 'aoizdnoaizndoainzodiaz',
      });
    });

    test('Forwards call to the query layer', async () => {
      const user = {
        email: 'test@strapi.io',
      };
      const update = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        query() {
          return { update };
        },
      };
      const params = { id: 1 };
      const input = { email: 'test@strapi.io' };
      const result = await userService.update(params, input);

      expect(update).toHaveBeenCalledWith(params, input);
      expect(result).toBe(user);
    });
  });

  describe('exists', () => {
    test('Return true if the user already exists', async () => {
      const count = jest.fn(() => Promise.resolve(1));

      global.strapi = {
        query: () => {
          return { count };
        },
      };

      const result = await userService.exists();

      expect(result).toBeTruthy();
    });

    test('Return false if the user does not exists', async () => {
      const count = jest.fn(() => Promise.resolve(0));

      global.strapi = {
        query: () => {
          return { count };
        },
      };

      const result = await userService.exists();

      expect(result).toBeFalsy();
    });
  });

  describe('Fetch users (paginated)', () => {
    const defaults = { page: 1, pageSize: 100 };

    beforeEach(() => {
      const fetchPage = jest.fn(({ page = defaults.page, pageSize = defaults.pageSize } = {}) => {
        return {
          results: Array.from({ length: pageSize }).map((_, i) => i + (page - 1) * pageSize),
          pagination: { page, pageSize, total: page * pageSize, pageCount: page },
        };
      });

      global.strapi = {
        query() {
          return { findPage: fetchPage, searchPage: fetchPage };
        },
      };
    });

    test('Fetch users with custom pagination', async () => {
      const pagination = { page: 2, pageSize: 15 };
      const foundPage = await userService.findPage(pagination);
      const searchedPage = await userService.searchPage(pagination);

      expect(foundPage.results.length).toBe(15);
      expect(foundPage.results[0]).toBe(15);
      expect((foundPage.pagination.total = 30));

      expect(searchedPage.results.length).toBe(15);
      expect(searchedPage.results[0]).toBe(15);
      expect((searchedPage.pagination.total = 30));
    });

    test('Fetch users with default pagination', async () => {
      const foundPage = await userService.findPage();
      const searchedPage = await userService.searchPage();

      expect(foundPage.results.length).toBe(100);
      expect(foundPage.results[0]).toBe(0);
      expect((foundPage.pagination.total = 100));

      expect(searchedPage.results.length).toBe(100);
      expect(searchedPage.results[0]).toBe(0);
      expect((searchedPage.pagination.total = 100));
    });

    test('Fetch users with partial pagination', async () => {
      const pagination = { page: 2 };
      const foundPage = await userService.findPage(pagination);
      const searchedPage = await userService.searchPage(pagination);

      expect(foundPage.results.length).toBe(100);
      expect(foundPage.results[0]).toBe(100);
      expect((foundPage.pagination.total = 200));

      expect(searchedPage.results.length).toBe(100);
      expect(searchedPage.results[0]).toBe(100);
      expect((searchedPage.pagination.total = 200));
    });
  });

  describe('findRegistrationInfo', () => {
    test('Returns undefined if not found', async () => {
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        query: () => {
          return { findOne };
        },
      };

      const res = await userService.findRegistrationInfo('ABCD');
      expect(res).toBeUndefined();
      expect(findOne).toHaveBeenCalledWith({ registrationToken: 'ABCD' });
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
        query: () => {
          return { findOne };
        },
      };

      const res = await userService.findRegistrationInfo('ABCD');

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
        query() {
          return {
            findOne,
          };
        },
        errors: {
          badRequest(msg) {
            throw new Error(msg);
          },
        },
      };

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      expect(userService.register(input)).rejects.toThrowError('Invalid registration info');
    });

    test('Calls udpate service', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const update = jest.fn(user => Promise.resolve(user));

      global.strapi = {
        query() {
          return {
            findOne,
          };
        },
        admin: {
          services: {
            user: { update },
          },
        },
      };

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await userService.register(input);

      expect(update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ firstname: 'test', lastname: 'Strapi', password: 'Test1234' })
      );
    });

    test('Set user to active', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const update = jest.fn(user => Promise.resolve(user));

      global.strapi = {
        query() {
          return {
            findOne,
          };
        },
        admin: {
          services: {
            user: { update },
          },
        },
      };

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await userService.register(input);

      expect(update).toHaveBeenCalledWith({ id: 1 }, expect.objectContaining({ isActive: true }));
    });

    test('Reset registrationToken', async () => {
      const findOne = jest.fn(() => Promise.resolve({ id: 1 }));
      const update = jest.fn(user => Promise.resolve(user));

      global.strapi = {
        query() {
          return {
            findOne,
          };
        },
        admin: {
          services: {
            user: { update },
          },
        },
      };

      const input = {
        registrationToken: '123',
        userInfo: {
          firstname: 'test',
          lastname: 'Strapi',
          password: 'Test1234',
        },
      };

      await userService.register(input);

      expect(update).toHaveBeenCalledWith(
        { id: 1 },
        expect.objectContaining({ registrationToken: null })
      );
    });
  });
});
