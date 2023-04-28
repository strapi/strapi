import { fixtures } from '@strapi/admin-test-utils';
import selectMenuLinks from '../selectors';

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
            name: 'api::address.address',
            search: 'page=1&pageSize=50&sort=city:ASC&plugins[i18n][locale]=fr',
            title: 'Addresses',
            to: '/content-manager/collectionType/api::address.address',
            uid: 'api::address.address',
          },
          {
            kind: 'collectionType',
            name: 'api::category.category',
            search: 'page=1&pageSize=50&sort=city:ASC&plugins[i18n][locale]=fr',
            title: 'Categories',
            to: '/content-manager/collectionType/api::category.category',
            uid: 'api::category.category',
          },
        ],
      };

      const actual = selectMenuLinks(store);
      const expected = [
        {
          kind: 'collectionType',
          name: 'api::address.address',
          search: 'page=1&pageSize=50&sort=city:ASC&plugins[i18n][locale]=fr',
          title: 'Addresses',
          to: '/content-manager/collectionType/api::address.address',
          uid: 'api::address.address',
        },
        {
          kind: 'collectionType',
          name: 'api::category.category',
          search: 'page=1&pageSize=50&sort=city:ASC&plugins[i18n][locale]=fr',
          title: 'Categories',
          to: '/content-manager/collectionType/api::category.category',
          uid: 'api::category.category',
        },
      ];

      expect(actual).toEqual(expected);
    });
  });
});
