/**
 * Controller actions as core serves them: each controller is resolved from the plugin entry with
 * `{ strapi }` when it is a factory, and its services come from `strapi.plugin('i18n')`.
 */
import { errors } from '@strapi/utils';
import {
  createCtx,
  createStore,
  createStrapi,
  loadPluginServer,
  localizedModel,
  resetGlobalStrapi,
  resolveWithStrapi,
} from '../../__tests__/resources/strapi';
import type { Ctx } from '../../__tests__/resources/strapi';

type UnknownRecord = Record<string, unknown>;
type Action = (ctx: Ctx) => Promise<unknown> | unknown;

const ARTICLE_UID = 'api::article.article';
const HOMEPAGE_UID = 'api::homepage.homepage';

const attributes = {
  title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  price: { type: 'integer' },
  stock: { type: 'integer' },
};
const contentTypes: Record<string, UnknownRecord> = {
  [ARTICLE_UID]: localizedModel(ARTICLE_UID, attributes),
  [HOMEPAGE_UID]: localizedModel(HOMEPAGE_UID, attributes, { kind: 'singleType' }),
};

const setup = ({ canRead = true, hasAIProvider = false, i18nServices = {} } = {}) => {
  const permissionChecker = {
    cannot: { read: jest.fn(() => canRead === false) },
    sanitizeOutput: jest.fn(async (document: UnknownRecord) => ({ ...document, sanitized: true })),
  };
  const contentQuery = {
    findOne: jest.fn(async () => ({ id: 1, locale: 'en', publishedAt: null, price: 10, stock: 2 })),
  };
  const localeQuery = { findOne: jest.fn(async () => null) };
  const { store, values } = createStore({ settings: { aiLocalizations: true } });

  const { strapi } = createStrapi(
    {
      contentTypes,
      components: {},
      contentType: jest.fn((uid: string) => contentTypes[uid]),
      getModel: jest.fn((uid: string) => contentTypes[uid]),
      db: {
        query: jest.fn((uid: string) =>
          uid === 'plugin::i18n.locale' ? localeQuery : contentQuery
        ),
      },
      store,
      admin: {
        services: {
          constants: { default: { READ_ACTION: 'read', CREATE_ACTION: 'create' } },
          permission: {
            findMany: jest.fn(async () => [
              { properties: { fields: ['price', 'title'], locales: ['fr'] } },
              { properties: { fields: ['stock'], locales: ['de'] } },
            ]),
          },
        },
      },
      plugins: {
        'content-manager': {
          services: {
            'permission-checker': { create: jest.fn(() => permissionChecker) },
            'document-metadata': {
              getMetadata: jest.fn(async () => ({
                availableLocales: [{ id: 2, locale: 'fr', publishedAt: null, title: 'x' }],
              })),
            },
          },
        },
      },
    },
    {
      i18nServices: {
        'ai-translations': { hasProvider: jest.fn(() => hasAIProvider) },
        ...i18nServices,
      },
    }
  );

  return { strapi, permissionChecker, contentQuery, localeQuery, storeValues: values };
};

const action = (strapi: ReturnType<typeof setup>['strapi'], handler: string) => {
  const [controllerName, actionName] = handler.split('.');
  const { controllers } = loadPluginServer();
  const controller = resolveWithStrapi<Record<string, Action>>(controllers[controllerName], strapi);

  return controller[actionName];
};

describe('i18n controllers resolved from the plugin entry', () => {
  afterEach(() => {
    resetGlobalStrapi();
  });

  test('iso-locales.listIsoLocales returns the iso locales', async () => {
    const { strapi } = setup();
    const ctx = createCtx();

    await action(strapi, 'iso-locales.listIsoLocales')(ctx);

    expect(ctx.body).toEqual(expect.arrayContaining([{ code: 'fr', name: 'French (fr)' }]));
  });

  describe('settings', () => {
    test('getSettings returns the stored settings and the AI provider availability', async () => {
      const { strapi } = setup({ hasAIProvider: true });
      const ctx = createCtx();

      await action(strapi, 'settings.getSettings')(ctx);

      expect(strapi.store).toHaveBeenCalledWith({ type: 'plugin', name: 'i18n', key: 'settings' });
      expect(ctx.body).toEqual({ data: { aiLocalizations: true, aiLocalizationsAvailable: true } });
    });

    test('updateSettings validates and stores the settings', async () => {
      const { strapi, storeValues } = setup();
      const ctx = createCtx({ request: { body: { aiLocalizations: false }, query: {} } });

      await action(strapi, 'settings.updateSettings')(ctx);

      expect(storeValues.get('settings')).toEqual({ aiLocalizations: false });
      expect(ctx.body).toEqual({ data: { aiLocalizations: false } });
    });

    test('updateSettings rejects invalid settings', async () => {
      const { strapi, storeValues } = setup();
      const ctx = createCtx({ request: { body: { aiLocalizations: 'maybe' }, query: {} } });

      await expect(action(strapi, 'settings.updateSettings')(ctx)).rejects.toThrow(
        errors.ValidationError
      );
      expect(storeValues.get('settings')).toEqual({ aiLocalizations: true });
    });
  });

  describe('locales', () => {
    test.each(['locales.updateLocale', 'locales.deleteLocale'])(
      '%s answers not found for an unknown locale',
      async (handler) => {
        const { strapi, localeQuery } = setup();
        const ctx = createCtx({
          params: { id: 99 },
          request: { body: { name: 'Unknown' }, query: {} },
        });

        await action(strapi, handler)(ctx);

        expect(localeQuery.findOne).toHaveBeenCalledWith({ where: { id: 99 } });
        expect(ctx.notFound).toHaveBeenCalledWith('locale.notFound');
      }
    );
  });

  describe('content-types.getNonLocalizedAttributes', () => {
    const run = async (body: UnknownRecord, options: Parameters<typeof setup>[0] = {}) => {
      const harness = setup(options);
      const userAbility = { can: jest.fn(() => true) };
      const ctx = createCtx({
        state: { user: { roles: [{ id: 3 }] }, userAbility },
        request: { body, query: {} },
      });

      await action(harness.strapi, 'content-types.getNonLocalizedAttributes')(ctx);

      return { ...harness, ctx, userAbility };
    };

    test('forbids users who cannot read the model', async () => {
      const { ctx, contentQuery, strapi } = await run(
        { model: ARTICLE_UID, id: 1, locale: 'fr' },
        { canRead: false }
      );

      expect(
        strapi.plugin('content-manager').service('permission-checker').create
      ).toHaveBeenCalledWith({ userAbility: ctx.state.userAbility, model: ARTICLE_UID });
      expect(ctx.forbidden).toHaveBeenCalled();
      expect(contentQuery.findOne).not.toHaveBeenCalled();
    });

    test('requires an id for a collection type', async () => {
      await expect(run({ model: ARTICLE_UID, locale: 'fr' })).rejects.toThrow(
        errors.ValidationError
      );
    });

    test('returns the permitted non localized fields of a single type without an id', async () => {
      const { ctx, contentQuery, strapi } = await run({ model: HOMEPAGE_UID, locale: 'fr' });

      expect(strapi.contentType).toHaveBeenCalledWith(HOMEPAGE_UID);
      expect(contentQuery.findOne).toHaveBeenCalledWith({ where: {}, populate: ['title'] });
      expect(ctx.body).toEqual({
        nonLocalizedFields: { price: 10 },
        localizations: [
          { id: 2, locale: 'fr', publishedAt: null },
          { id: 1, locale: 'en', publishedAt: null },
        ],
      });
    });
  });

  describe('content-types.getFillFromLocaleData', () => {
    const query = {
      documentId: 'doc',
      sourceLocale: 'en',
      targetLocale: 'fr',
      collectionType: 'collection-types',
    };

    const run = async (
      ctxQuery: UnknownRecord,
      { canRead = true, rawDocument = { title: 'Hello' } as UnknownRecord | null } = {}
    ) => {
      const fillFromLocale = {
        fetchRawDocument: jest.fn(async () => rawDocument),
        transformDocument: jest.fn(async (document: UnknownRecord) => ({
          ...document,
          transformed: true,
        })),
      };
      const harness = setup({ canRead, i18nServices: { 'fill-from-locale': fillFromLocale } });
      const userAbility = { can: jest.fn() };
      const ctx = createCtx({
        state: { userAbility },
        params: { model: ARTICLE_UID },
        query: ctxQuery,
      });

      await action(harness.strapi, 'content-types.getFillFromLocaleData')(ctx);

      return { ...harness, ctx, fillFromLocale, userAbility };
    };

    test('returns the sanitized source document transformed for the target locale', async () => {
      const { ctx, fillFromLocale, permissionChecker, userAbility } = await run(query);

      expect(fillFromLocale.fetchRawDocument).toHaveBeenCalledWith(ARTICLE_UID, 'en', 'doc');
      expect(permissionChecker.sanitizeOutput).toHaveBeenCalledWith({ title: 'Hello' });
      expect(fillFromLocale.transformDocument).toHaveBeenCalledWith(
        { title: 'Hello', sanitized: true },
        ARTICLE_UID,
        'fr',
        userAbility
      );
      expect(ctx.body).toEqual({ data: { title: 'Hello', sanitized: true, transformed: true } });
    });

    test('accepts single types without a document id', async () => {
      const { ctx } = await run({
        ...query,
        documentId: undefined,
        collectionType: 'single-types',
      });

      expect(ctx.body).toEqual({ data: { title: 'Hello', sanitized: true, transformed: true } });
    });

    test('rejects an invalid query', async () => {
      await expect(run({ ...query, targetLocale: undefined })).rejects.toThrow(
        errors.ValidationError
      );
    });

    test('forbids users who cannot read the model', async () => {
      const { ctx, fillFromLocale } = await run(query, { canRead: false });

      expect(ctx.forbidden).toHaveBeenCalled();
      expect(fillFromLocale.fetchRawDocument).not.toHaveBeenCalled();
    });

    test('answers not found without a source document', async () => {
      const { ctx, fillFromLocale } = await run(query, { rawDocument: null });

      expect(ctx.notFound).toHaveBeenCalled();
      expect(fillFromLocale.transformDocument).not.toHaveBeenCalled();
    });
  });
});
