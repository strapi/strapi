import { fixtures } from '@strapi/admin-test-utils';

import { selectCollectionTypePermissions } from '../selectors';

describe('Admin | content manager | hooks | useSyncRbac | selectors', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state };
  });

  describe('selectCollectionTypePermissions', () => {
    it('resolves the permissions key of the "rbacProvider" store key', () => {
      const uid = 'uid';
      store.rbacProvider.collectionTypesRelatedPermissions[uid] = { permission: true };

      const actual = selectCollectionTypePermissions(store, uid);
      const expected = { permission: true };

      expect(actual).toEqual(expected);
    });
  });
});
