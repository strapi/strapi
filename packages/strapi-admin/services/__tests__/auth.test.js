'use strict';

const { validatePassword, hashPassword, checkCredentials } = require('../auth');

describe('Auth', () => {
  describe('checkCredentials', () => {
    test('Fails on not found user, without leaking not found info', async () => {
      const findOne = jest.fn(() => Promise.resolve());

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const input = { email: 'test@strapi.io', password: 'pcw123' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ email: input.email });
      expect(res).toEqual([null, false, { message: 'Invalid credentials' }]);
    });

    test('Fails when password is invalid, without leaking specific info', async () => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const input = { email: 'test@strapi.io', password: 'wrong-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ email: input.email });
      expect(res).toEqual([null, false, { message: 'Invalid credentials' }]);
    });

    test.each([false, null, 1, 0])('Fails when user is not active (%s)', async isActive => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        isActive,
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const input = { email: 'test@strapi.io', password: 'test-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ email: input.email });
      expect(res).toEqual([null, false, { message: 'User not active' }]);
    });

    test('Returns user when all checks pass', async () => {
      const user = {
        id: 1,
        firstname: '',
        lastname: '',
        email: 'test@strapi.io',
        isActive: true,
        password: await hashPassword('test-password'),
      };

      const findOne = jest.fn(() => Promise.resolve(user));

      global.strapi = {
        query() {
          return { findOne };
        },
      };

      const input = { email: 'test@strapi.io', password: 'test-password' };
      const res = await checkCredentials(input);

      expect(findOne).toHaveBeenCalledWith({ email: input.email });
      expect(res).toEqual([null, user]);
    });
  });

  describe('validatePassword', () => {
    test('Compares password with hash', async () => {
      const password = 'pcw123';
      const hash = await hashPassword(password);

      const isValid = await validatePassword(password, hash);
      expect(isValid).toBe(true);
    });
  });
});
