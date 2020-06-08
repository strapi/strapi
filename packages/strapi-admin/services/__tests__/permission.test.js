'use strict';

const permissionService = require('../permission');

describe('Permission Service', () => {
  describe('Find permissions', () => {
    test('Find calls the right db query', async () => {
      const find = jest.fn(() => Promise.resolve([]));
      global.strapi = {
        query() {
          return { find };
        },
      };

      await permissionService.find({ role: 1 });

      expect(find).toHaveBeenCalledWith({ role: 1 }, []);
    });
  });

  describe('Assign permissions', () => {
    test('Delete previous permissions', async () => {
      const deleteFn = jest.fn(() => Promise.resolve([]));
      const create = jest.fn(() => Promise.resolve({}));
      const getAll = jest.fn(() => []);

      global.strapi = {
        admin: { services: { permission: { provider: { getAll } } } },
        query() {
          return { delete: deleteFn, create };
        },
      };

      await permissionService.assign(1, []);

      expect(deleteFn).toHaveBeenCalledWith({ role: 1 });
    });

    test('Create new permissions', async () => {
      const deleteFn = jest.fn(() => Promise.resolve([]));
      const create = jest.fn(() => Promise.resolve({}));
      const getAll = jest.fn(() =>
        Array(5)
          .fill(0)
          .map((v, i) => ({ actionId: `action-${i}` }))
      );

      global.strapi = {
        admin: { services: { permission: { provider: { getAll } } } },
        query() {
          return { delete: deleteFn, create };
        },
      };

      const permissions = Array(5)
        .fill(0)
        .map((v, i) => ({ action: `action-${i}` }));

      await permissionService.assign(1, permissions);

      expect(create).toHaveBeenCalledTimes(5);
      expect(create).toHaveBeenNthCalledWith(1, {
        action: 'action-0',
        role: 1,
        conditions: [],
        fields: [],
        subject: null,
      });
    });
  });
});
