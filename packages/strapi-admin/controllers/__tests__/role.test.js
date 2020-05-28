'use strict';

const roleController = require('../role');

const createContext = ({ params = {}, query = {}, body = {} }, overrides = {}) => ({
  params,
  query,
  request: {
    body,
  },
  ...overrides,
});

describe('Role controller', () => {
  describe('getPermissions', () => {
    test('Fails if role does not exist', async () => {
      const findOne = jest.fn(() => Promise.resolve());
      const notFound = jest.fn(() => Promise.resolve());

      const ctx = createContext(
        {
          params: { id: 1 },
        },
        {
          notFound,
        }
      );

      global.strapi = {
        admin: {
          services: {
            role: {
              findOne,
            },
          },
        },
      };

      await roleController.getPermissions(ctx);

      expect(findOne).toHaveBeenCalledWith({ id: ctx.params.id });
      expect(notFound).toHaveBeenCalled();
    });
  });
});
