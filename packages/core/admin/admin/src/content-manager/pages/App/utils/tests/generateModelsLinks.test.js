import generateModelsLinks, { generateLinks } from '../generateModelsLinks';

describe('ADMIN | LeftMenu | utils', () => {
  describe('generateLinks', () => {
    it('should return an empty array', () => {
      expect(generateLinks([])).toEqual([]);
    });

    it('should return an array filtered and formatted with the correct data', () => {
      const modelsConfigurations = [
        {
          uid: 'api::address.address',
          settings: {
            pageSize: 2,
            defaultSortBy: 'name',
            defaultSortOrder: 'ASC',
          },
        },
      ];
      const data = [
        {
          isDisplayed: true,
          kind: 'collectionType',
          uid: 'api::address.address',
          info: {
            displayName: 'Addresses',
          },
        },
        {
          isDisplayed: false,
          kind: 'collectionType',
          uid: 'api::test.test',
          info: {
            displayName: 'Test',
          },
        },
        {
          isDisplayed: true,
          kind: 'singleType',
          uid: 'api::test1.test1',
          info: {
            displayName: 'Test 1',
          },
        },
      ];

      const expected = [
        {
          to: '/content-manager/collectionType/api::address.address',
          isDisplayed: true,
          search: `page=1&pageSize=2&sort=name:ASC`,
          permissions: [
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::address.address',
            },
            {
              action: 'plugin::content-manager.explorer.read',
              subject: 'api::address.address',
            },
          ],
          kind: 'collectionType',
          title: 'Addresses',
          uid: 'api::address.address',
          name: 'api::address.address',
        },
        {
          to: '/content-manager/singleType/api::test1.test1',
          isDisplayed: true,
          search: null,
          kind: 'singleType',
          title: 'Test 1',
          uid: 'api::test1.test1',
          name: 'api::test1.test1',
          permissions: [
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::test1.test1',
            },
            {
              action: 'plugin::content-manager.explorer.read',
              subject: 'api::test1.test1',
            },
          ],
        },
      ];

      expect(generateLinks(data, 'collectionTypes', modelsConfigurations)).toEqual(expected);
    });
  });

  describe('generateModelsLinks', () => {
    it('should return an object of section links', () => {
      const data = [
        {
          isDisplayed: true,
          kind: 'collectionType',
          uid: 'api::address.address',
          info: {
            displayName: 'Addresses',
          },
        },
        {
          isDisplayed: false,
          kind: 'collectionType',
          uid: 'api::test.test',
          info: {
            displayName: 'Test',
          },
        },
        {
          isDisplayed: true,
          kind: 'singleType',
          uid: 'api::test1.test1',
          info: {
            displayName: 'Test 1',
          },
        },
      ];

      const expected = {
        collectionTypesSectionLinks: [
          {
            isDisplayed: true,
            search: null,
            kind: 'collectionType',
            title: 'Addresses',
            to: '/content-manager/collectionType/api::address.address',
            uid: 'api::address.address',
            name: 'api::address.address',
            permissions: [
              {
                action: 'plugin::content-manager.explorer.create',
                subject: 'api::address.address',
              },
              {
                action: 'plugin::content-manager.explorer.read',
                subject: 'api::address.address',
              },
            ],
          },
        ],
        singleTypesSectionLinks: [
          {
            isDisplayed: true,
            kind: 'singleType',
            search: null,
            title: 'Test 1',
            to: '/content-manager/singleType/api::test1.test1',
            uid: 'api::test1.test1',
            name: 'api::test1.test1',
            permissions: [
              {
                action: 'plugin::content-manager.explorer.read',
                subject: 'api::test1.test1',
              },
            ],
          },
        ],
      };

      expect(generateModelsLinks(data)).toEqual(expected);
    });
  });
});
