import generateModelsLinks, { generateLinks } from '../generateModelsLinks';

describe('ADMIN | LeftMenu | utils', () => {
  describe('generateLinks', () => {
    it('should return an empty array', () => {
      expect(generateLinks([])).toEqual([]);
    });

    it('should return an array filtered and formatted with the correct data', () => {
      const modelsConfigurations = [
        {
          uid: 'application::address.address',
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
          uid: 'application::address.address',
          info: {
            label: 'Addresses',
          },
        },
        {
          isDisplayed: false,
          kind: 'collectionType',
          uid: 'application::test.test',
          info: {
            label: 'Test',
          },
        },
        {
          isDisplayed: true,
          kind: 'singleType',
          uid: 'application::test1.test1',
          info: {
            label: 'Test 1',
          },
        },
      ];

      const expected = [
        {
          to: '/plugins/content-manager/collectionType/application::address.address',
          isDisplayed: true,
          search: `page=1&pageSize=2&_sort=name:ASC`,
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::address.address',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::address.address',
            },
          ],
          kind: 'collectionType',
          title: 'Addresses',
          uid: 'application::address.address',
          name: 'application::address.address',
        },
        {
          to: '/plugins/content-manager/singleType/application::test1.test1',
          isDisplayed: true,
          search: null,
          kind: 'singleType',
          title: 'Test 1',
          uid: 'application::test1.test1',
          name: 'application::test1.test1',
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::test1.test1',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::test1.test1',
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
          uid: 'application::address.address',
          info: {
            label: 'Addresses',
          },
        },
        {
          isDisplayed: false,
          kind: 'collectionType',
          uid: 'application::test.test',
          info: {
            label: 'Test',
          },
        },
        {
          isDisplayed: true,
          kind: 'singleType',
          uid: 'application::test1.test1',
          info: {
            label: 'Test 1',
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
            to: '/plugins/content-manager/collectionType/application::address.address',
            uid: 'application::address.address',
            name: 'application::address.address',
            permissions: [
              {
                action: 'plugins::content-manager.explorer.create',
                subject: 'application::address.address',
              },
              {
                action: 'plugins::content-manager.explorer.read',
                subject: 'application::address.address',
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
            to: '/plugins/content-manager/singleType/application::test1.test1',
            uid: 'application::test1.test1',
            name: 'application::test1.test1',
            permissions: [
              {
                action: 'plugins::content-manager.explorer.read',
                subject: 'application::test1.test1',
              },
            ],
          },
        ],
      };

      expect(generateModelsLinks(data)).toEqual(expected);
    });
  });
});
