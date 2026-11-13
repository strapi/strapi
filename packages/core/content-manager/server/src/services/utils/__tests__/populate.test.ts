import {
  getDeepPopulate,
  getDeepPopulateDraftCount,
  getFieldsForListView,
  getPopulateForLocalizations,
  getPopulateOverridesForListView,
} from '../populate';

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
      pluginOptions: { i18n: { localized: true } },
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
    withLocalizationsNotLocalized: {
      uid: 'api::product.product',
      modelName: 'Fake non-localized model with localizations attribute',
      pluginOptions: {},
      attributes: {
        name: {
          type: 'string',
        },
        localizations: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::product.product',
          visible: false,
          private: true,
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

    describe('initialPopulate override', () => {
      test('defaults to validation populate for localizations', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any) as Record<string, any>;

        // Default behavior: localizations gets validation populate (populated via getPopulateForValidation)
        expect(result).toHaveProperty('localizations');
        expect(result.localizations).toHaveProperty('populate');
      });

      test('initialPopulate overrides localizations with minimal fields', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any, {
          initialPopulate: {
            localizations: { fields: ['locale', 'documentId', 'publishedAt', 'updatedAt'] },
          } as any,
        }) as Record<string, any>;

        expect(result).toEqual({
          localizations: {
            fields: ['locale', 'documentId', 'publishedAt', 'updatedAt'],
          },
        });
      });

      test('initialPopulate with false suppresses localizations populate', () => {
        const uid = 'withLocalizations';

        const result = getDeepPopulate(uid as any, {
          initialPopulate: {
            localizations: false,
          } as any,
        }) as Record<string, any>;

        expect(result).toEqual({
          localizations: false,
        });
      });

      test('initialPopulate override works for any relation attribute', () => {
        const uid = 'relationOTM';

        const result = getDeepPopulate(uid as any, {
          initialPopulate: {
            relationAttrName: { fields: ['id', 'name'] },
          } as any,
        }) as Record<string, any>;

        expect(result).toEqual({
          relationAttrName: { fields: ['id', 'name'] },
        });
      });
    });
  });

  describe('getDeepPopulateDraftCount', () => {
    const draftCountModels = {
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          category: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::category.category',
          },
          author: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::author.author',
          },
        },
      },
      // Separate source model: results are cached per uid
      'api::page.page': {
        uid: 'api::page.page',
        attributes: {
          category: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'api::category.category',
          },
        },
      },
      'api::category.category': {
        uid: 'api::category.category',
        pluginOptions: { i18n: { localized: true } },
        options: { draftAndPublish: true },
        attributes: {},
      },
      'api::author.author': {
        uid: 'api::author.author',
        options: { draftAndPublish: true },
        attributes: {},
      },
    } as any;

    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => draftCountModels[uid]),
        localization: {
          isLocalizedContentType: jest.fn(
            (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
              model.pluginOptions?.i18n?.localized === true
          ),
        },
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('selects locale only for relations targeting localized content types', () => {
      const result = getDeepPopulateDraftCount('api::article.article' as any);

      expect(result).toEqual({
        hasRelations: true,
        populate: {
          category: {
            fields: ['documentId', 'locale'],
            filters: { publishedAt: { $null: true } },
          },
          author: {
            fields: ['documentId'],
            filters: { publishedAt: { $null: true } },
          },
        },
      });
    });

    test('follows the provider over a stale localized flag', () => {
      jest.mocked(strapi.localization.isLocalizedContentType).mockReturnValue(false);

      const result = getDeepPopulateDraftCount('api::page.page' as any);

      expect(result.populate.category).toEqual({
        fields: ['documentId'],
        filters: { publishedAt: { $null: true } },
      });
    });
  });

  describe('getPopulateForLocalizations', () => {
    const localizationsModels = {
      'api::localized.localized': {
        uid: 'api::localized.localized',
        pluginOptions: { i18n: { localized: true } },
        attributes: {},
      },
      'api::not-localized.not-localized': {
        uid: 'api::not-localized.not-localized',
        pluginOptions: { i18n: { localized: false } },
        attributes: {},
      },
      'api::no-plugin-options.no-plugin-options': {
        uid: 'api::no-plugin-options.no-plugin-options',
        attributes: {},
      },
    } as any;

    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => localizationsModels[uid]),
        localization: {
          isLocalizedContentType: jest.fn(
            (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
              model.pluginOptions?.i18n?.localized === true
          ),
        },
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('restricts localizations to metadata fields for localized content types', () => {
      expect(getPopulateForLocalizations('api::localized.localized' as any)).toEqual({
        localizations: { fields: ['locale', 'documentId', 'publishedAt', 'updatedAt'] },
      });
    });

    test('returns an empty populate for non-localized content types', () => {
      expect(getPopulateForLocalizations('api::not-localized.not-localized' as any)).toEqual({});
      expect(
        getPopulateForLocalizations('api::no-plugin-options.no-plugin-options' as any)
      ).toEqual({});
    });

    test('follows the provider over a stale localized flag', () => {
      jest.mocked(strapi.localization.isLocalizedContentType).mockReturnValue(false);

      expect(getPopulateForLocalizations('api::localized.localized' as any)).toEqual({});
    });
  });

  describe('list view', () => {
    const listModels = {
      'api::article.article': {
        uid: 'api::article.article',
        attributes: {
          title: { type: 'string' },
          views: { type: 'integer' },
          body: { type: 'richtext' },
          content: { type: 'blocks' },
          data: { type: 'json' },
          secret: { type: 'password' },
          pluginData: { type: 'json', visible: false },
          locale: { type: 'string', visible: false },
          publishedAt: { type: 'datetime' },
          blocks: { type: 'dynamiczone', components: ['default.block'] },
          seo: { type: 'component', component: 'default.block' },
          author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
          category: { type: 'relation', relation: 'oneToOne', target: 'api::category.category' },
          tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
          owner: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
          target: { type: 'relation', relation: 'morphToOne' },
          strapi_stage: {
            type: 'relation',
            relation: 'manyToOne',
            target: 'plugin::review-workflows.workflow-stage',
            visible: false,
          },
        },
      },
      'api::author.author': {
        uid: 'api::author.author',
        attributes: { name: { type: 'string' }, avatar: { type: 'media' } },
      },
      'api::category.category': {
        uid: 'api::category.category',
        attributes: { label: { type: 'string' } },
      },
      'default.block': {
        uid: 'default.block',
        attributes: { text: { type: 'string' } },
      },
    } as any;

    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => listModels[uid]),
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('selects the scalars the list can display and the non-visible ones', () => {
      expect(getFieldsForListView('api::article.article' as any)).toEqual([
        'title',
        'views',
        'pluginData',
        'locale',
        'publishedAt',
      ]);
    });

    test('skips dynamic zones and reduces visible to-one relations to their main field', () => {
      const overrides = getPopulateOverridesForListView('api::article.article' as any, {
        author: { edit: { mainField: 'name' } },
        category: { edit: { mainField: 'label' } },
        tags: { edit: { mainField: 'name' } },
        // a main field that is not a scalar of the target only keeps the documentId
        owner: { edit: { mainField: 'avatar' } },
      });

      expect(overrides).toEqual({
        blocks: false,
        author: { fields: ['name'] },
        category: { fields: ['label'] },
        owner: { fields: [] },
      });
    });

    test('a to-one relation without a configured main field only keeps the documentId', () => {
      expect(getPopulateOverridesForListView('api::article.article' as any)).toMatchObject({
        author: { fields: [] },
        category: { fields: [] },
      });
    });

    test('the deep populate of the list skips dynamic zones', () => {
      const populate = getDeepPopulate('api::article.article' as any, {
        maxLevel: 1,
        countMany: true,
        initialPopulate: getPopulateOverridesForListView('api::article.article' as any, {
          author: { edit: { mainField: 'name' } },
        }) as any,
      });

      expect(populate).not.toHaveProperty('blocks');
      expect(populate).toMatchObject({
        seo: { populate: {} },
        author: { fields: ['name'] },
        tags: { count: true },
        strapi_stage: true,
      });
    });
  });
});
