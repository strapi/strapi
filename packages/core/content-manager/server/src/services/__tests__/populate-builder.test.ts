import populateBuilder from '../populate-builder';

const mockModel = {
  kind: 'collectionType',
  collectionName: 'mocks',
  apiName: 'mock',
  globalId: 'Mock',
  uid: 'api::mock.mock',
  modelType: 'contentType',
  modelName: 'mock',
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    localizations: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::restaurant.restaurant',
      writable: false,
      private: false,
      configurable: false,
      visible: false,
      unstable_virtual: true,
      joinColumn: [Object],
    },
  },
};

describe('populate-builder', () => {
  describe('limitLocalizationsPopulate', () => {
    const uid = 'api::mock.mock';

    test('returns limited populate', async () => {
      global.strapi = {
        ...global.strapi,
        getModel: jest.fn(() => mockModel) as unknown as typeof global.strapi.getModel,
      };
      const populate: any = await populateBuilder()(uid)
        .populateDeep()
        .limitLocalizationsPopulate()
        .build();

      expect(
        ['documentId', 'id', 'locale', 'createdAt', 'updatedAt', 'publishedAt'].every((field) =>
          populate?.localizations?.fields?.includes(field)
        )
      ).toBeTruthy();
    });

    test('returns no limited populate if model is not localized', async () => {
      global.strapi = {
        ...global.strapi,
        getModel: jest.fn(() => ({
          ...mockModel,
          pluginOptions: { i18n: { localized: false } },
        })) as unknown as typeof global.strapi.getModel,
      };
      const populate: any = await populateBuilder()(uid)
        .populateDeep()
        .limitLocalizationsPopulate()
        .build();

      expect(populate?.localizations?.fields).toBeUndefined();
    });
  });
});
