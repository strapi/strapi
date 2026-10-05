import { queryParams } from '@strapi/utils';
import documentMetadataServiceFactory from '../document-metadata';

const createService = (overrides: Record<string, unknown> = {}) => {
  const strapi = {
    getModel: () => ({
      uid: 'api::article.article',
      options: {},
      pluginOptions: { i18n: { localized: true } },
      attributes: {},
    }),
    localization: {
      isLocalizedContentType: () => true,
      getDefaultLocale: async () => 'en',
      getNonLocalizedAttributes: () => [],
    },
    ...overrides,
  } as unknown as Parameters<typeof documentMetadataServiceFactory>[0]['strapi'];

  return documentMetadataServiceFactory({ strapi });
};

describe('document-metadata service', () => {
  describe('getAvailableLocales', () => {
    /**
     * Regression guard. The admin's
     * `useDocument.getInitialFormValues` inherits non-localized scalar/media
     * values from `meta.availableLocales[0]` when creating a new locale draft.
     * That selection is only meaningful if the default locale sits first —
     * otherwise drift between siblings (caused by `copyNonLocalizedFields` only
     * syncing at locale-creation time) can surface stale values to the user.
     */
    it('places the default locale first in the result', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        // current locale (excluded from the result)
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
          { id: 4, documentId: 'doc-1', locale: 'de' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['en', 'fr', 'de']);
    });

    it('preserves the original order of non-default locales', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'de' },
          { id: 3, documentId: 'doc-1', locale: 'fr' },
          { id: 4, documentId: 'doc-1', locale: 'en' },
          { id: 5, documentId: 'doc-1', locale: 'es' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['en', 'de', 'fr', 'es']);
    });

    it('returns the result untouched if the default locale is not in the available locales', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'de' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'de']);
    });

    it('no-ops when the i18n plugin is unavailable', async () => {
      const service = createService({
        // Inert default of `strapi.localization` when no provider is registered
        localization: {
          isLocalizedContentType: () => false,
          getDefaultLocale: async () => null,
          getNonLocalizedAttributes: () => [],
        },
      });

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'en']);
    });

    it('no-ops when getDefaultLocale throws', async () => {
      const service = createService({
        localization: {
          isLocalizedContentType: () => true,
          async getDefaultLocale() {
            throw new Error('boom');
          },
          getNonLocalizedAttributes: () => [],
        },
      });

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'nl' },
        [
          { id: 2, documentId: 'doc-1', locale: 'fr' },
          { id: 3, documentId: 'doc-1', locale: 'en' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr', 'en']);
    });

    it('excludes the current locale from the result', async () => {
      const service = createService();

      const result = await service.getAvailableLocales(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'en' },
        [
          { id: 1, documentId: 'doc-1', locale: 'en' },
          { id: 2, documentId: 'doc-1', locale: 'fr' },
        ]
      );

      expect(result?.map((entry) => entry.locale)).toEqual(['fr']);
    });
  });

  describe('getMetadata non-localized fields', () => {
    const localizedModel = {
      uid: 'api::article.article',
      options: {},
      pluginOptions: { i18n: { localized: true } },
      attributes: {
        title: { type: 'string' },
        body: { type: 'text' },
        cover: { type: 'media' },
        author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
      },
    };

    const createServiceWithFindMany = (overrides: Record<string, unknown> = {}) => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = createService({
        getModel: () => localizedModel,
        get: () => ({ transform: (_uid: string, params: unknown) => params }),
        db: { query: () => ({ findMany }) },
        ...overrides,
      });

      return { service, findMany };
    };

    const paramsOf = (findMany: jest.Mock) => findMany.mock.calls[0][0];

    it('selects non-localized scalar fields and populates non-localized media fields', async () => {
      const { service, findMany } = createServiceWithFindMany({
        localization: {
          isLocalizedContentType: () => true,
          getDefaultLocale: async () => 'en',
          // `author` is not scalar nor media and `unknown` is not an attribute: both dropped
          getNonLocalizedAttributes: () => ['title', 'cover', 'author', 'unknown'],
        },
      });

      await service.getMetadata('api::article.article', {
        id: 1,
        documentId: 'doc-1',
        locale: 'en',
      });

      const params = paramsOf(findMany);
      expect(params.fields).toEqual([
        'id',
        'documentId',
        'locale',
        'updatedAt',
        'createdAt',
        'publishedAt',
        'title',
      ]);
      expect(params.populate).toEqual({
        cover: { populate: { folder: true } },
        createdBy: { select: ['id', 'firstname', 'lastname', 'email'] },
        updatedBy: { select: ['id', 'firstname', 'lastname', 'email'] },
      });
    });

    const expectNoNonLocalizedFields = (findMany: jest.Mock) => {
      const params = paramsOf(findMany);
      expect(params.fields).toEqual([
        'id',
        'documentId',
        'locale',
        'updatedAt',
        'createdAt',
        'publishedAt',
      ]);
      expect(params.populate).toEqual({
        createdBy: { select: ['id', 'firstname', 'lastname', 'email'] },
        updatedBy: { select: ['id', 'firstname', 'lastname', 'email'] },
      });
    };

    it('treats a stale localized flag as non-localized when no provider is registered', async () => {
      const { service, findMany } = createServiceWithFindMany({
        // Inert default of `strapi.localization` when no provider is registered
        localization: {
          isLocalizedContentType: () => false,
          getDefaultLocale: async () => null,
          getNonLocalizedAttributes: () => [],
        },
      });

      const metadata = await service.getMetadata('api::article.article', {
        id: 1,
        documentId: 'doc-1',
        locale: 'en',
      });

      expect(metadata).toEqual({
        availableLocales: [],
        availableStatus: [],
        defaultLocale: null,
        versions: [],
      });
      expect(findMany).not.toHaveBeenCalled();
    });

    it('adds no non-localized fields when getNonLocalizedAttributes throws', async () => {
      const { service, findMany } = createServiceWithFindMany({
        localization: {
          isLocalizedContentType: () => true,
          getDefaultLocale: async () => 'en',
          getNonLocalizedAttributes() {
            throw new Error('boom');
          },
        },
      });

      await service.getMetadata('api::article.article', {
        id: 1,
        documentId: 'doc-1',
        locale: 'en',
      });

      expectNoNonLocalizedFields(findMany);
    });
  });

  describe('getManyAvailableStatus', () => {
    const createServiceWithQuery = () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const service = createService({ query: () => ({ findMany }) });

      return { service, findMany };
    };

    const whereOf = (findMany: jest.Mock) => findMany.mock.calls[0][0].where;

    it('filters on the locales when every version is localized', async () => {
      const { service, findMany } = createServiceWithQuery();

      await service.getManyAvailableStatus('api::article.article', [
        { id: 1, documentId: 'doc-1', locale: 'en', publishedAt: null },
        { id: 2, documentId: 'doc-2', locale: 'fr', publishedAt: null },
      ]);

      expect(whereOf(findMany)).toMatchObject({ locale: { $in: ['en', 'fr'] } });
      expect(whereOf(findMany).$or).toBeUndefined();
    });

    it('does not filter on the locale when no version is localized', async () => {
      const { service, findMany } = createServiceWithQuery();

      await service.getManyAvailableStatus('api::article.article', [
        { id: 1, documentId: 'doc-1', publishedAt: null },
        { id: 2, documentId: 'doc-2', publishedAt: null },
      ]);

      expect(whereOf(findMany).locale).toBeUndefined();
      expect(whereOf(findMany).$or).toBeUndefined();
    });

    /**
     * A content type can hold versions with a locale next to versions without one —
     * after i18n is disabled on it, or when a locale reaches a non-localized content
     * type through the API. `locales` then only describes part of the batch, so
     * filtering on it alone hid the counterparts of the non-localized versions, and
     * the list view reported published documents as drafts.
     */
    it('also matches non-localized versions when the batch mixes both', async () => {
      const { service, findMany } = createServiceWithQuery();

      await service.getManyAvailableStatus('api::article.article', [
        { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
        { id: 2, documentId: 'doc-2', publishedAt: null },
      ]);

      expect(whereOf(findMany).locale).toBeUndefined();
      expect(whereOf(findMany).$or).toEqual([
        { locale: { $in: ['fr'] } },
        { locale: { $null: true } },
      ]);
    });
  });

  describe('getMetadata defaultLocale', () => {
    it('includes defaultLocale even when availableLocales and availableStatus are skipped', async () => {
      const service = createService();

      const result = await service.getMetadata(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
        { availableLocales: false, availableStatus: false }
      );

      expect(result.defaultLocale).toBe('en');
      expect(result.availableLocales).toEqual([]);
      expect(result.availableStatus).toEqual([]);
    });

    it('sets defaultLocale to null when getDefaultLocale throws', async () => {
      const service = createService({
        localization: {
          isLocalizedContentType: () => true,
          async getDefaultLocale() {
            throw new Error('boom');
          },
          getNonLocalizedAttributes: () => [],
        },
      });

      const result = await service.getMetadata(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
        { availableLocales: false, availableStatus: false }
      );

      expect(result.defaultLocale).toBeNull();
    });

    it('populates non-localized component fields into availableLocales query params', async () => {
      const findMany = jest.fn().mockResolvedValue([
        {
          id: 2,
          documentId: 'doc-1',
          locale: 'en',
          publishedAt: null,
          variants: [{ name: 'a' }],
        },
      ]);
      const transform = jest.fn((uid, params) => params);
      const getNonLocalizedAttributes = jest.fn().mockReturnValue(['sku', 'variants', 'images']);

      const service = createService({
        getModel: () => ({
          uid: 'api::article.article',
          options: { draftAndPublish: true },
          pluginOptions: { i18n: { localized: true } },
          attributes: {
            sku: { type: 'string' },
            variants: { type: 'component', component: 'product.variants', repeatable: true },
            images: { type: 'media', multiple: true },
            name: { type: 'string' },
          },
        }),
        localization: {
          isLocalizedContentType: () => true,
          getDefaultLocale: async () => 'en',
          getNonLocalizedAttributes,
        },
        get(key: string) {
          if (key === 'query-params') {
            return { transform };
          }
          return undefined;
        },
        db: {
          query: () => ({ findMany }),
        },
      });

      const result = await service.getMetadata(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
        { availableLocales: true, availableStatus: false }
      );

      expect(result.defaultLocale).toBe('en');
      expect(transform).toHaveBeenCalled();
      const [, params] = transform.mock.calls[0];
      expect(params.populate.variants).toBe(true);
      expect(params.populate.images).toEqual({ populate: { folder: true } });
      expect(params.fields).toEqual(expect.arrayContaining(['sku']));
      expect(findMany).toHaveBeenCalled();
    });

    it('deep-populates nested component and dynamic zone paths from i18n', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const getNonLocalizedAttributes = jest
        .fn()
        .mockReturnValue(['sku', 'profile', 'blocks', 'images']);
      const getNestedPopulateOfNonLocalizedAttributes = jest
        .fn()
        .mockImplementation((uid: string) => {
          if (uid === 'shared.hero') {
            return ['image', 'body', 'body.items', 'body.sections'];
          }

          if (uid === 'shared.section') {
            return ['items'];
          }

          return [
            'profile',
            'profile.mid',
            'profile.mid.inners',
            'blocks',
            'blocks.image',
            'blocks.body',
            'blocks.body.items',
          ];
        });

      const service = createService({
        getModel: (uid: string) =>
          ({
            'api::article.article': {
              uid: 'api::article.article',
              options: { draftAndPublish: true },
              pluginOptions: { i18n: { localized: true } },
              attributes: {
                sku: { type: 'string' },
                profile: { type: 'component', component: 'shared.outer', repeatable: false },
                blocks: { type: 'dynamiczone', components: ['shared.hero'] },
                images: { type: 'media', multiple: true },
                name: { type: 'string' },
              },
            },
            'shared.hero': {
              uid: 'shared.hero',
              attributes: {
                image: { type: 'media', multiple: false },
                body: { type: 'component', component: 'shared.body', repeatable: false },
              },
            },
            'shared.outer': {
              uid: 'shared.outer',
              attributes: {
                mid: { type: 'component', component: 'shared.mid', repeatable: false },
              },
            },
            'shared.mid': {
              uid: 'shared.mid',
              attributes: {
                inners: { type: 'component', component: 'shared.item', repeatable: true },
              },
            },
            'shared.body': {
              uid: 'shared.body',
              modelType: 'component',
              attributes: {
                items: { type: 'component', component: 'shared.item', repeatable: true },
                sections: { type: 'dynamiczone', components: ['shared.section'] },
              },
            },
            'shared.section': {
              uid: 'shared.section',
              modelType: 'component',
              attributes: {
                items: { type: 'component', component: 'shared.item', repeatable: true },
              },
            },
            'shared.item': {
              uid: 'shared.item',
              modelType: 'component',
              attributes: {
                label: { type: 'string' },
              },
            },
          })[uid],
        localization: {
          isLocalizedContentType: () => true,
          getDefaultLocale: async () => 'en',
          getNonLocalizedAttributes,
          getNestedPopulateOfNonLocalizedAttributes,
        },
        get(key: string) {
          if (key === 'query-params') {
            const transformer = queryParams.createTransformer({
              getModel: (uid: string) =>
                (this as { getModel: (modelUID: string) => never }).getModel(uid),
            });
            return {
              transform: jest.fn((uid, params) => ({
                ...params,
                populate: transformer.transformQueryParams(uid, {
                  populate: params.populate,
                }).populate,
              })),
            };
          }
          return undefined;
        },
        db: {
          query: () => ({ findMany }),
        },
      });

      await service.getMetadata(
        'api::article.article',
        { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
        { availableLocales: true, availableStatus: false }
      );

      const [params] = findMany.mock.calls[0];
      expect(params.populate.profile).toEqual({
        populate: {
          mid: {
            populate: {
              inners: true,
            },
          },
        },
      });
      expect(params.populate.blocks).toEqual({
        on: {
          'shared.hero': {
            populate: {
              image: true,
              body: {
                populate: {
                  items: true,
                  sections: {
                    on: {
                      'shared.section': {
                        populate: {
                          items: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  });
});
