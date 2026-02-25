import { getDeepPopulate } from '../populate';

describe('Populate', () => {
  const fakeModels = {
    empty: {
      modelName: 'Fake empty model',
      attributes: {},
    },
    component: {
      modelName: 'Fake component model',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'empty',
        },
      },
    },
    dynZone: {
      modelName: 'Fake dynamic zone model',
      attributes: {
        dynZoneAttrName: {
          type: 'dynamiczone',
          components: ['empty', 'component'],
        },
      },
    },
    relationOTM: {
      modelName: 'Fake relation oneToMany model',
      attributes: {
        relationAttrName: {
          type: 'relation',
          relation: 'oneToMany',
        },
      },
    },
    relationOTO: {
      modelName: 'Fake relation oneToOne model',
      attributes: {
        relationAttrName: {
          type: 'relation',
          relation: 'oneToOne',
        },
      },
    },
    media: {
      modelName: 'Fake media model',
      attributes: {
        mediaAttrName: {
          type: 'media',
        },
      },
    },
    withLocalizations: {
      uid: 'api::article.article',
      modelName: 'Fake model with localizations',
      attributes: {
        title: {
          type: 'string',
        },
        localizations: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::article.article',
          visible: false,
        },
      },
    },
  } as any;

  describe('getDeepPopulate', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => fakeModels[uid]),
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('with empty model', async () => {
      const uid = 'empty';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({});
    });

    test('with component model', async () => {
      const uid = 'component';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({
        componentAttrName: { populate: {} },
      });
    });

    test('with dynamic zone model', async () => {
      const uid = 'dynZone';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({
        dynZoneAttrName: {
          on: {
            component: {
              populate: {
                componentAttrName: {
                  populate: {},
                },
              },
            },
            empty: {
              populate: {},
            },
          },
        },
      });
    });

    test('with relation model - oneToMany', async () => {
      const uid = 'relationOTM';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({
        relationAttrName: true,
      });
    });

    test('with relation model - oneToMany - with countMany', async () => {
      const uid = 'relationOTM';

      const result = getDeepPopulate(uid as any, { countMany: true });

      expect(result).toEqual({
        relationAttrName: { count: true },
      });
    });

    test('with relation model - oneToOne', async () => {
      const uid = 'relationOTO';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({
        relationAttrName: true,
      });
    });

    test('with relation model - oneToOne - with countOne', async () => {
      const uid = 'relationOTO';

      const result = getDeepPopulate(uid as any, { countOne: true });

      expect(result).toEqual({
        relationAttrName: { count: true },
      });
    });

    test('with media model', async () => {
      const uid = 'media';

      const result = getDeepPopulate(uid as any);

      expect(result).toEqual({
        mediaAttrName: { populate: { folder: true } },
      });
    });

    describe('populateLocalizationsMode option', () => {
      test('defaults to validation populate for localizations', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any);

        // Default behavior: localizations gets validation populate (populated via getPopulateForValidation)
        expect(result).toHaveProperty('localizations');
        expect(result.localizations).toHaveProperty('populate');
      });

      test('populateLocalizationsMode: minimal returns only locale, documentId, publishedAt fields', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any, { populateLocalizationsMode: 'minimal' });

        expect(result).toEqual({
          localizations: {
            fields: ['locale', 'documentId', 'publishedAt'],
          },
        });
      });

      test('populateLocalizationsMode: none excludes localizations from populate', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any, { populateLocalizationsMode: 'none' });

        expect(result).toEqual({
          localizations: false,
        });
      });

      test('populateLocalizationsMode: validation returns full validation populate', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any, { populateLocalizationsMode: 'validation' });

        expect(result).toHaveProperty('localizations');
        expect(result.localizations).toHaveProperty('populate');
      });
    });
  });
});
