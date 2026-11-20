'use strict';

const createUsersPermissionsService = require('../users-permissions');

describe('Users-Permissions service', () => {
  describe('syncPermissions', () => {
    test('skips controllers that are undefined and deletes stale permissions', async () => {
      const deletePermission = jest.fn().mockResolvedValue({});
      const queries = {
        'plugin::users-permissions.role': { findMany: jest.fn().mockResolvedValue([]) },
        'plugin::users-permissions.permission': {
          findMany: jest
            .fn()
            .mockResolvedValue([
              { action: 'api::article.article.find' },
              { action: 'api::article.stale.find' },
            ]),
          delete: deletePermission,
        },
      };

      const strapi = {
        db: { query: jest.fn((uid) => queries[uid]) },
        apis: {
          article: {
            controllers: { article: { find() {} }, empty: undefined },
          },
        },
        plugins: {
          'qa-plugin': { controllers: { empty: undefined } },
        },
      };

      await createUsersPermissionsService({ strapi }).syncPermissions();

      expect(deletePermission).toHaveBeenCalledTimes(1);
      expect(deletePermission).toHaveBeenCalledWith({
        where: { action: 'api::article.stale.find' },
      });
    });
  });
});
