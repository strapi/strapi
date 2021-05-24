import { selectPermissions, selectCollectionTypePermissions } from '../selectors';

describe('selectors', () => {
  let store;

  beforeEach(() => {
    store = {};
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
    // TODO add store fixture
    it('resolves the permissions key of the "rbacProvider" store key', () => {
      store.rbacProvider = {
        collectionTypesRelatedPermissions: {
          some: 'permission again',
        },
      };

      const actual = selectCollectionTypePermissions(store);
      const expected = {
        some: 'permission again',
      };

      expect(actual).toEqual(expected);
    });
  });
});
