import generateModelsLinks, { generateLinks } from '../generateModelsLinks';

describe('ADMIN | LeftMenu | utils', () => {
  describe('generateLinks', () => {
    it('should return an empty array', () => {
      expect(generateLinks([])).toEqual([]);
    });

    it('should return an array filtered and formatted with the correct data', () => {
      const data = [
        {
          isDisplayed: true,
          label: 'Addresses',
          schema: { modelType: 'contentType', kind: 'collectionType' },
          uid: 'application::address.address',
        },
        {
          isDisplayed: false,
          label: 'Test',
          schema: { kind: 'collectionType' },
          uid: 'application::test.test',
        },
        {
          isDisplayed: true,
          label: 'Test 1',
          schema: { kind: 'singleType' },
          uid: 'application::test1.test1',
        },
      ];

      const expected = [
        {
          icon: 'circle',
          destination: '/plugins/content-manager/collectionType/application::address.address',
          isDisplayed: false,
          label: 'Addresses',
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::address.address',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::address.address',
            },
            {
              action: 'plugins::content-manager.explorer.update',
              subject: 'application::address.address',
            },
          ],
        },
        {
          icon: 'circle',
          destination: '/plugins/content-manager/singleType/application::test1.test1',
          isDisplayed: false,
          label: 'Test 1',
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::test1.test1',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::test1.test1',
            },
            {
              action: 'plugins::content-manager.explorer.update',
              subject: 'application::test1.test1',
            },
          ],
        },
      ];

      expect(generateLinks(data)).toEqual(expected);
    });
  });

  describe('generateModelsLinks', () => {
    it('should return an object of section links', () => {
      const data = [
        {
          isDisplayed: true,
          label: 'Addresses',
          schema: { modelType: 'contentType', kind: 'collectionType' },
          uid: 'application::address.address',
        },
        {
          isDisplayed: false,
          label: 'Test',
          schema: { kind: 'collectionType' },
          uid: 'application::test.test',
        },
        {
          isDisplayed: true,
          label: 'Test 1',
          schema: { kind: 'singleType' },
          uid: 'application::test1.test1',
        },
      ];

      const expected = {
        collectionTypesSectionLinks: [
          {
            icon: 'circle',
            destination: '/plugins/content-manager/collectionType/application::address.address',
            isDisplayed: false,
            label: 'Addresses',
            permissions: [
              {
                action: 'plugins::content-manager.explorer.create',
                subject: 'application::address.address',
              },
              {
                action: 'plugins::content-manager.explorer.read',
                subject: 'application::address.address',
              },
              {
                action: 'plugins::content-manager.explorer.update',
                subject: 'application::address.address',
              },
            ],
          },
        ],
        singleTypesSectionLinks: [
          {
            icon: 'circle',
            destination: '/plugins/content-manager/singleType/application::test1.test1',
            isDisplayed: false,
            label: 'Test 1',
            permissions: [
              {
                action: 'plugins::content-manager.explorer.create',
                subject: 'application::test1.test1',
              },
              {
                action: 'plugins::content-manager.explorer.read',
                subject: 'application::test1.test1',
              },
              {
                action: 'plugins::content-manager.explorer.update',
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
