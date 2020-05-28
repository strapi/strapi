'use strict';

const userController = require('../user');

const createContext = ({ params = {}, query = {}, body = {} }, overrides = {}) => ({
  params,
  query,
  request: {
    body,
  },
  ...overrides,
});

describe('User Controller', () => {
  describe('Create User', () => {
    const body = {
      firstname: 'John',
      lastname: 'Doe',
      email: 'johndoe@email.com',
      roles: [1, 2],
    };

    test('Fails if user already exist', async () => {
      const exists = jest.fn(() => Promise.resolve(true));
      const badRequest = jest.fn();
      const ctx = createContext({ body }, { badRequest });

      global.strapi = {
        admin: {
          services: {
            user: {
              exists,
            },
          },
        },
      };

      await userController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ email: body.email });
      expect(badRequest).toHaveBeenCalledWith('Email already taken');
    });

    test('Create User Successfully', async () => {
      const create = jest.fn(() => Promise.resolve(body));
      const exists = jest.fn(() => Promise.resolve(false));
      const sanitizeUser = jest.fn(user => Promise.resolve(user));
      const badRequest = jest.fn();
      const created = jest.fn();
      const ctx = createContext({ body }, { badRequest, created });

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
      };

      await userController.create(ctx);

      expect(exists).toHaveBeenCalledWith({ email: body.email });
      expect(badRequest).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledWith(body);
      expect(sanitizeUser).toHaveBeenCalled();
      expect(created).toHaveBeenCalled();
    });
  });

  describe('Find a user by its ID', () => {});
});
