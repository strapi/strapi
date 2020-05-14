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
      });

      expect(res).toEqual({
        id: 1,
        firstname: 'Test',
        otherField: 'Hello',
      });
    });
  });

  describe('create', () => {
    test('Creates a user by merging given and default attributes', async () => {
      const create = jest.fn(user => Promise.resolve(user));

      global.strapi = {
        query() {
          return { create };
        },
      };

      const input = { firstname: 'John', lastname: 'Doe', email: 'johndoe@email.com' };
      const expected = { ...input, isActive: false, roles: [] };

      const result = await userService.create(input);

      expect(result).toStrictEqual(expected);
    });

    test('Creates a user by using given attributes', async () => {
      const createFn = jest.fn(user => Promise.resolve(user));

      global.strapi = {
        query() {
          return { create: createFn };
        },
      };

      const input = {
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@email.com',
        roles: [2],
        isActive: true,
      };
      const expected = _.clone(input);
      const result = await userService.create(input);

      expect(result).toStrictEqual(expected);
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
});
