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
          icon: 'circle',
          destination: '/plugins/content-manager/collectionType/application::address.address',
          isDisplayed: true,
          label: 'Addresses',
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
        },
        {
          icon: 'circle',
          destination: '/plugins/content-manager/singleType/application::test1.test1',
          isDisplayed: true,
          label: 'Test 1',
          search: null,
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
            icon: 'circle',
            destination: '/plugins/content-manager/collectionType/application::address.address',
            isDisplayed: true,
            label: 'Addresses',
            search: null,
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
            icon: 'circle',
            destination: '/plugins/content-manager/singleType/application::test1.test1',
            isDisplayed: true,
            label: 'Test 1',
            search: null,
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
