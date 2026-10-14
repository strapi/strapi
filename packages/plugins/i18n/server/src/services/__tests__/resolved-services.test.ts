/**
 * Service methods as core serves them: each service is resolved from the plugin entry with
 * `{ strapi }`, and reaches the other i18n services through `strapi.plugin('i18n')`.
 */
import {
  createStore,
  createStrapi,
  localizedModel,
  resetGlobalStrapi,
} from '../../__tests__/resources/strapi';

type UnknownRecord = Record<string, unknown>;
type Model = UnknownRecord & { uid: string; attributes: UnknownRecord };

const ARTICLE_UID = 'api::article.article';
const SEO_UID = 'shared.seo';
const LINK_UID = 'shared.link';

const seo = {
  uid: SEO_UID,
  modelType: 'component',
  attributes: { image: { type: 'media' }, label: { type: 'string' } },
};
const link = {
  uid: LINK_UID,
  modelType: 'component',
  attributes: {
    label: { type: 'string' },
    page: { type: 'relation', relation: 'oneToOne', target: ARTICLE_UID },
  },
};
const article = localizedModel(ARTICLE_UID, {
  title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  slug: { type: 'uid' },
  author: { type: 'relation', relation: 'manyToOne', target: 'api::author.author' },
  cover: { type: 'media', multiple: false },
  gallery: { type: 'media', multiple: true },
  seo: { type: 'component', component: SEO_UID, repeatable: false },
  links: { type: 'component', component: LINK_UID, repeatable: true },
  blocks: { type: 'dynamiczone', components: [SEO_UID] },
}) as Model;

const models: Record<string, UnknownRecord> = {
  [ARTICLE_UID]: article,
  [SEO_UID]: seo,
  [LINK_UID]: link,
};

const setup = ({ i18nServices = {} as UnknownRecord, settings = {} as unknown } = {}) => {
  const contentQuery = {
    findMany: jest.fn(async () => [{ id: 2, locale: 'fr' }]),
    update: jest.fn(),
  };
  const localeQuery = {
    findMany: jest.fn(async () => [
      { id: 1, code: 'en' },
      { id: 2, code: 'fr' },
    ]),
  };
  const documentsApi = {
    omitComponentData: jest.fn((data: UnknownRecord) => ({ ...data, omitted: true })),
    updateComponents: jest.fn(async () => ({ components: true })),
  };
  const { store } = createStore({ default_locale: 'en', settings });

  const harness = createStrapi(
    {
      contentTypes: { [ARTICLE_UID]: article },
      components: { [SEO_UID]: seo, [LINK_UID]: link },
      getModel: jest.fn((uid: string) => models[uid]),
      db: {
        query: jest.fn((uid: string) =>
          uid === 'plugin::i18n.locale' ? localeQuery : contentQuery
        ),
      },
      documents: Object.assign(
        jest.fn(() => documentsApi),
        {
          use: jest.fn(),
          utils: { transformData: jest.fn(async (data: UnknownRecord) => ({ ...data })) },
        }
      ),
      store,
      log: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
    },
    { i18nServices }
  );

  return { ...harness, contentQuery, localeQuery, documentsApi };
};

describe('i18n services resolved from the plugin entry', () => {
  afterEach(() => {
    resetGlobalStrapi();
  });

  describe('localizations.syncNonLocalizedAttributes', () => {
    test('replaces populated media with their ids, nested in components and dynamic zones', async () => {
      const { services, strapi, contentQuery, documentsApi } = setup();
      const entry = {
        id: 1,
        documentId: 'doc',
        locale: 'en',
        publishedAt: '2026-01-01',
        title: 'Hello',
        cover: { id: 5, url: '/5.png' },
        gallery: [{ id: 6 }, 7],
        seo: { id: 30, image: { id: 8 }, label: 'seo' },
        links: [{ id: 31, label: 'a' }],
        blocks: [{ id: 32, __component: SEO_UID, image: { id: 9 }, label: 'dz' }, { id: 33 }],
      };
      const { syncNonLocalizedAttributes } = services.localizations as {
        syncNonLocalizedAttributes: (entry: UnknownRecord, model: Model) => Promise<void>;
      };

      await syncNonLocalizedAttributes(entry, article);

      const expected = {
        cover: 5,
        gallery: [6, 7],
        seo: { image: 8, label: 'seo' },
        links: [{ label: 'a' }],
        // entries without `__component` keep their id
        blocks: [{ __component: SEO_UID, image: 9, label: 'dz' }, { id: 33 }],
      };
      expect(contentQuery.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc', publishedAt: { $ne: null }, locale: { $ne: 'en' } },
        select: ['locale', 'id'],
      });
      expect(documentsApi.omitComponentData).toHaveBeenCalledWith(expected);
      expect(strapi.documents.utils.transformData).toHaveBeenCalledWith(expected, {
        uid: ARTICLE_UID,
        status: 'published',
        locale: 'fr',
        allowMissingId: true,
      });
      expect(documentsApi.updateComponents).toHaveBeenCalledWith({ id: 2, locale: 'fr' }, expected);
      expect(contentQuery.update).toHaveBeenCalledWith({
        where: { documentId: 'doc', publishedAt: { $ne: null }, locale: { $eq: 'fr' } },
        data: { ...expected, omitted: true, components: true },
      });
    });

    test('syncs drafts with the other draft locales', async () => {
      const { services, contentQuery } = setup();
      const { syncNonLocalizedAttributes } = services.localizations as {
        syncNonLocalizedAttributes: (entry: UnknownRecord, model: Model) => Promise<void>;
      };

      await syncNonLocalizedAttributes(
        { documentId: 'doc', locale: 'en', publishedAt: null, cover: null },
        article
      );

      expect(contentQuery.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc', publishedAt: null, locale: { $ne: 'en' } },
        select: ['locale', 'id'],
      });
      expect(contentQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { documentId: 'doc', publishedAt: null, locale: { $eq: 'fr' } },
        })
      );
    });
  });

  describe('content-types', () => {
    type ContentTypesService = {
      getLocalizedAttributes: (model: Model) => string[];
      copyNonLocalizedAttributes: (model: Model, entry: unknown) => unknown;
      fillNonLocalizedAttributes: (
        entry: UnknownRecord,
        related: unknown,
        options: { model: string }
      ) => void;
      getNestedPopulateOfNonLocalizedAttributes: (uid: string) => string[];
    };
    const getService = () => setup().services['content-types'] as ContentTypesService;

    test('getLocalizedAttributes lists localized, relation and uid attributes', () => {
      expect(getService().getLocalizedAttributes(article)).toEqual(['title', 'slug', 'author']);
    });

    test('copyNonLocalizedAttributes drops ids in components and dynamic zones', () => {
      const entry = {
        id: 1,
        title: 'Hello',
        seo: null,
        links: [{ id: 2, label: 'a' }],
        blocks: [{ id: 3, __component: SEO_UID, label: 'dz' }],
      };

      expect(getService().copyNonLocalizedAttributes(article, entry)).toEqual({
        seo: null,
        links: [{ label: 'a' }],
        blocks: [{ __component: SEO_UID, label: 'dz' }],
      });
      expect(entry.links[0].id).toBe(2);
    });

    test('fillNonLocalizedAttributes ignores a missing related entry', () => {
      const entry = { title: 'Hello' };

      getService().fillNonLocalizedAttributes(entry, null, { model: ARTICLE_UID });

      expect(entry).toEqual({ title: 'Hello' });
    });

    test('getNestedPopulateOfNonLocalizedAttributes populates component relations', () => {
      expect(getService().getNestedPopulateOfNonLocalizedAttributes(ARTICLE_UID)).toEqual([
        'title',
        'slug',
        'cover',
        'gallery',
        'seo',
        'links',
        'blocks',
        'seo.image',
        'links.page',
        'blocks.image',
      ]);
    });
  });

  describe('ai-localizations', () => {
    type AILocalizationsService = {
      isEnabled: () => Promise<boolean>;
      generateDocumentLocalizations: (params: {
        model: string;
        document: UnknownRecord;
      }) => Promise<void>;
      setupMiddleware: () => void;
    };

    const setupAI = ({
      hasProvider = true,
      settings = { aiLocalizations: true } as unknown,
    } = {}) => {
      const aiTranslations = {
        hasProvider: jest.fn(() => hasProvider),
        generateTranslations: jest.fn(async () => {
          throw new Error('provider down');
        }),
      };
      const jobs = { upsertJobForDocument: jest.fn() };
      const harness = setup({
        settings,
        i18nServices: { 'ai-translations': aiTranslations, 'ai-localization-jobs': jobs },
      });

      return {
        ...harness,
        aiTranslations,
        jobs,
        service: harness.services['ai-localizations'] as AILocalizationsService,
      };
    };

    test.each([
      ['without a provider', { hasProvider: false }, false],
      ['when enabled in the settings', {}, true],
      ['without settings', { settings: null }, false],
      ['when disabled in the settings', { settings: { aiLocalizations: false } }, false],
    ])('isEnabled %s', async (_name, options, expected) => {
      await expect(setupAI(options).service.isEnabled()).resolves.toBe(expected);
    });

    test('does not read the settings without a provider', async () => {
      const { service, strapi } = setupAI({ hasProvider: false });

      await service.isEnabled();

      expect(strapi.store).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'settings' }));
    });

    test.each([
      ['for a non default locale', { documentId: 'doc', locale: 'fr', title: 'Bonjour' }],
      ['for a document without a documentId', { locale: 'en', title: 'Hello' }],
    ])('does not translate %s', async (_name, document) => {
      const { service, aiTranslations, jobs } = setupAI();

      await service.generateDocumentLocalizations({ model: ARTICLE_UID, document });

      expect(aiTranslations.generateTranslations).not.toHaveBeenCalled();
      expect(jobs.upsertJobForDocument).not.toHaveBeenCalled();
    });

    test('warns about a document without a documentId', async () => {
      const { service, strapi } = setupAI();

      await service.generateDocumentLocalizations({
        model: ARTICLE_UID,
        document: { locale: 'en', title: 'Hello' },
      });

      expect(strapi.log.warn).toHaveBeenCalledWith(
        `AI Localizations: missing documentId for ${ARTICLE_UID}`
      );
    });

    test('marks the job failed and rethrows when the provider fails', async () => {
      const { service, jobs, aiTranslations } = setupAI();

      await expect(
        service.generateDocumentLocalizations({
          model: ARTICLE_UID,
          document: { documentId: 'doc', locale: 'en', title: 'Hello' },
        })
      ).rejects.toThrow('provider down');

      expect(aiTranslations.generateTranslations).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceLocale: 'en',
          targetLocales: ['fr'],
          content: { title: 'Hello' },
        })
      );
      expect(jobs.upsertJobForDocument.mock.calls.map(([job]) => job.status)).toEqual([
        'processing',
        'failed',
      ]);
    });

    describe('document service middleware', () => {
      const getMiddleware = (options: Parameters<typeof setupAI>[0] = {}) => {
        const harness = setupAI(options);
        harness.service.setupMiddleware();
        const [middleware] = (harness.strapi.documents.use as jest.Mock).mock.calls[0];
        const generate = jest
          .spyOn(harness.service, 'generateDocumentLocalizations')
          .mockResolvedValue(undefined);

        return { ...harness, middleware, generate };
      };

      test('starts localizations after a create', async () => {
        const { middleware, generate } = getMiddleware();
        const result = { documentId: 'doc', locale: 'en' };

        await expect(
          middleware({ action: 'create', contentType: { uid: ARTICLE_UID } }, async () => result)
        ).resolves.toBe(result);
        expect(generate).toHaveBeenCalledWith({ model: ARTICLE_UID, document: result });
      });

      test.each([
        ['other actions', 'delete', {}],
        ['disabled AI localizations', 'update', { settings: { aiLocalizations: false } }],
      ])('skips %s', async (_name, action, options) => {
        const { middleware, generate } = getMiddleware(options);

        await middleware({ action, contentType: { uid: ARTICLE_UID } }, async () => ({}));

        expect(generate).not.toHaveBeenCalled();
      });
    });
  });
});
