import selectMenuLinks from '../selectors';
import { fixtures } from '../../../../../../../../admin-test-utils';

describe('CONTENT MANAGER | Containers | CollectionTypeFormWrapper | selectors', () => {
  let store;

  beforeEach(() => {
    store = { ...fixtures.store.state };
  });

  describe('selectMenuLinks', () => {
    it('should extract the collection type links from the global state', () => {
      store['content-manager_app'] = {
        collectionTypeLinks: [
          {
            kind: 'collectionType',
            name: 'application::address.address',
            search: 'page=1&pageSize=50&_sort=city:ASC&plugins[i18n][locale]=fr',
            title: 'Addresses',
            to: '/content-manager/collectionType/application::address.address',
            uid: 'application::address.address',
          },
          {
            kind: 'collectionType',
            name: 'application::category.category',
            search: 'page=1&pageSize=50&_sort=city:ASC&plugins[i18n][locale]=fr',
            title: 'Categories',
            to: '/content-manager/collectionType/application::category.category',
            uid: 'application::category.category',
          },
        ],
      };

      const actual = selectMenuLinks(store);
      const expected = [
        {
          kind: 'collectionType',
          name: 'application::address.address',
          search: 'page=1&pageSize=50&_sort=city:ASC&plugins[i18n][locale]=fr',
          title: 'Addresses',
          to: '/content-manager/collectionType/application::address.address',
          uid: 'application::address.address',
        },
        {
          kind: 'collectionType',
          name: 'application::category.category',
          search: 'page=1&pageSize=50&_sort=city:ASC&plugins[i18n][locale]=fr',
          title: 'Categories',
          to: '/content-manager/collectionType/application::category.category',
          uid: 'application::category.category',
        },
      ];

      expect(actual).toEqual(expected);
    });
  });
});
