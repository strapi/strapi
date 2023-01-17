import { fixtures } from '@strapi/admin-test-utils/lib';
import { selectPermissions, selectCollectionTypePermissions } from '../selectors';

describe('Admin | content manager | hooks | useSyncRbac | selectors', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state };
  });

  describe('selectPermissions', () => {
    it('resolves the permissions key of the "content-manager_rbacManager" store key', () => {
      store['content-manager_rbacManager'] = {
        permissions: {
          some: 'permission',
        },
      };

      const actual = selectPermissions(store);
      const expected = {
        some: 'permission',
      };

      expect(actual).toEqual(expected);
    });
  });

  describe('selectCollectionTypePermissions', () => {
    it('resolves the permissions key of the "rbacProvider" store key', () => {
      store.rbacProvider.collectionTypesRelatedPermissions.some = 'permission again';

      const actual = selectCollectionTypePermissions(store);
      const expected = {
        some: 'permission again',
      };

      expect(actual).toEqual(expected);
    });
  });
});
