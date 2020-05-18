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
      const createToken = jest.fn(() => 'token');

      global.strapi = {
        admin: {
          services: {
            token: { createToken },
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

    test('Creates a user by using given attributes', async () => {
      const create = jest.fn(user => Promise.resolve(user));
      const createToken = jest.fn(() => 'token');

      global.strapi = {
        admin: {
          services: {
            token: { createToken },
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
});
