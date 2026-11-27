import { describe, expect, test, vi } from 'vitest';
import { createStrapiMock } from '../../../tests/utils';
import createUsersPermissionsService from '../users-permissions';

describe('Users-Permissions service', () => {
  describe('syncPermissions', () => {
    test('skips controllers that are undefined and deletes stale permissions', async () => {
      const deletePermission = vi.fn().mockResolvedValue({});
      const queries = {
        'plugin::users-permissions.role': { findMany: vi.fn().mockResolvedValue([]) },
        'plugin::users-permissions.permission': {
          findMany: vi
            .fn()
            .mockResolvedValue([
              { action: 'api::article.article.find' },
              { action: 'api::article.stale.find' },
            ]),
          delete: deletePermission,
        },
      };

      const strapi = createStrapiMock({
        db: { query: vi.fn((uid: keyof typeof queries) => queries[uid]) },
        apis: {
          article: {
            controllers: { article: { find() {} }, empty: undefined },
          },
        },
        plugins: {
          'qa-plugin': { controllers: { empty: undefined } },
        },
      });

      await createUsersPermissionsService({ strapi }).syncPermissions();

      expect(deletePermission).toHaveBeenCalledTimes(1);
      expect(deletePermission).toHaveBeenCalledWith({
        where: { action: 'api::article.stale.find' },
      });
    });
  });
});
