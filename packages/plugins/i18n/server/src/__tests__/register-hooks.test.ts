/**
 * Pins what `register({ strapi })` wires into strapi: the locale attributes added to every content
 * type, the afterSync permission repair, the content-manager locale middleware and the graphql
 * extension. Handlers are captured from the strapi mock and called like core calls them.
 */
import { errors } from '@strapi/utils';
import {
  createStore,
  createStrapi,
  loadPluginServer,
  localizedModel,
  nonLocalizedModel,
  resetGlobalStrapi,
} from './resources/strapi';

type UnknownRecord = Record<string, unknown>;
type RouterMiddleware = (ctx: UnknownRecord, next: () => unknown) => unknown;

const ARTICLE_UID = 'api::article.article';
const HOMEPAGE_UID = 'api::homepage.homepage';
const TAG_UID = 'api::tag.tag';

const createContentTypes = (): Record<string, UnknownRecord> => ({
  [ARTICLE_UID]: localizedModel(ARTICLE_UID, { title: { type: 'string' } }),
  [HOMEPAGE_UID]: localizedModel(HOMEPAGE_UID, {}, { kind: 'singleType' }),
  [TAG_UID]: nonLocalizedModel(TAG_UID, { name: { type: 'string' } }),
});

const createGraphqlExtension = () => {
  const calls: string[] = [];
  const extension = {
    use: jest.fn(),
    shadowCRUD: jest.fn((uid: string) => ({
      disableMutations: () => calls.push(`${uid} disableMutations`),
      field: (field: string) => ({
        disableInput: () => calls.push(`${uid}.${field} disableInput`),
      }),
    })),
  };

  return { extension, calls };
};

const setup = ({ withGraphql = false, singleTypeEntity = null as unknown } = {}) => {
  const contentTypes = createContentTypes();
  const locales = [
    { id: 1, code: 'en', name: 'English (en)' },
    { id: 2, code: 'fr', name: 'French (fr)' },
  ];
  const localeQuery = {
    findOne: jest.fn(async ({ where }: { where: UnknownRecord }) => {
      return locales.find((locale) => locale.code === where.code) ?? null;
    }),
  };
  const permissionQuery = { update: jest.fn(async () => ({})) };
  const query = jest.fn((uid: string) =>
    uid === 'plugin::i18n.locale' ? localeQuery : permissionQuery
  );
  const hooks: Record<string, { register: jest.Mock }> = {};
  const graphql = createGraphqlExtension();
  const { store } = createStore({ default_locale: 'en' });

  const { strapi } = createStrapi({
    contentTypes,
    components: {},
    getModel: jest.fn((uid: string) => contentTypes[uid]),
    localization: { register: jest.fn() },
    get: jest.fn(() => ({ add: jest.fn() })),
    hook: jest.fn((name: string) => {
      hooks[name] = hooks[name] ?? { register: jest.fn() };
      return hooks[name];
    }),
    server: { router: { use: jest.fn() } },
    store,
    db: {
      query,
      metadata: { identifiers: { getTableName: jest.fn((name: string) => `t_${name}`) } },
    },
    entityService: { findMany: jest.fn(async () => singleTypeEntity) },
    log: { error: jest.fn() },
    admin: {
      services: {
        permission: {
          findMany: jest.fn(async () => [
            { id: 11, properties: {} },
            { id: 12, properties: { locales: null } },
            { id: 13, properties: { fields: ['title'], locales: [] } },
          ]),
        },
      },
    },
    plugins:
      withGraphql === true ? { graphql: { services: { extension: graphql.extension } } } : {},
  });

  return { strapi, contentTypes, hooks, graphql, mocks: { localeQuery, permissionQuery } };
};

const runRegister = async (options: Parameters<typeof setup>[0] = {}) => {
  const ctx = setup(options);

  await loadPluginServer().register({ strapi: ctx.strapi });

  return ctx;
};

describe('i18n register', () => {
  afterEach(() => {
    resetGlobalStrapi();
  });

  describe('locale attributes', () => {
    test.each([
      [ARTICLE_UID, false],
      [TAG_UID, true],
    ])('adds locale and localizations to %s (private: %s)', async (uid, isPrivate) => {
      const { contentTypes } = await runRegister();
      const { attributes } = contentTypes[uid] as { attributes: Record<string, UnknownRecord> };

      expect(attributes.locale).toEqual({
        writable: true,
        private: isPrivate,
        configurable: false,
        visible: false,
        type: 'string',
      });
      expect(attributes.localizations).toEqual({
        type: 'relation',
        relation: 'oneToMany',
        target: uid,
        writable: false,
        private: isPrivate,
        configurable: false,
        visible: false,
        unstable_virtual: true,
        joinColumn: {
          name: 'document_id',
          referencedColumn: 'document_id',
          referencedTable: `t_${uid.split('.')[1]}`,
          on: expect.any(Function),
        },
      });
    });

    test('excludes the loaded entries from the localizations join', async () => {
      const { contentTypes } = await runRegister();
      const { attributes } = contentTypes[ARTICLE_UID] as {
        attributes: { localizations: { joinColumn: { on: (p: UnknownRecord) => unknown } } };
      };

      expect(attributes.localizations.joinColumn.on({ results: [{ id: 1 }, { id: 4 }] })).toEqual({
        id: { $notIn: [1, 4] },
      });
    });
  });

  describe('afterSync permission repair', () => {
    const runAfterSync = async (oldContentTypes: UnknownRecord | null) => {
      const ctx = await runRegister();
      const hook = ctx.hooks['strapi::content-types.afterSync'];

      await hook.register.mock.calls[0][0]({ oldContentTypes, contentTypes: ctx.contentTypes });

      return ctx;
    };

    test('gives the default locale to permissions of newly localized content types', async () => {
      const { strapi, mocks } = await runAfterSync({
        [ARTICLE_UID]: nonLocalizedModel(ARTICLE_UID),
        [TAG_UID]: nonLocalizedModel(TAG_UID),
      });

      expect(strapi.admin.services.permission.findMany).toHaveBeenCalledWith({
        where: { subject: { $in: [ARTICLE_UID] } },
      });
      expect(mocks.permissionQuery.update.mock.calls).toEqual([
        [{ where: { id: 11 }, data: { properties: { locales: ['en'] } } }],
        [{ where: { id: 13 }, data: { properties: { fields: ['title'], locales: ['en'] } } }],
      ]);
    });

    test('logs permissions that fail to update and keeps updating the others', async () => {
      const ctx = setup();
      ctx.mocks.permissionQuery.update.mockRejectedValueOnce(new Error('locked'));
      await loadPluginServer().register({ strapi: ctx.strapi });
      const hook = ctx.hooks['strapi::content-types.afterSync'];

      await hook.register.mock.calls[0][0]({
        oldContentTypes: { [ARTICLE_UID]: nonLocalizedModel(ARTICLE_UID) },
        contentTypes: ctx.contentTypes,
      });

      expect(ctx.mocks.permissionQuery.update).toHaveBeenCalledTimes(2);
      expect(ctx.strapi.log.error).toHaveBeenCalledWith(
        'Failed to patch i18n permission during newly-localized type repair.',
        new Error('locked')
      );
    });

    test.each([
      ['on the first sync', null],
      ['when nothing became localized', { [ARTICLE_UID]: localizedModel(ARTICLE_UID) }],
    ])('does nothing %s', async (_name, oldContentTypes) => {
      const { strapi, mocks } = await runAfterSync(oldContentTypes);

      expect(strapi.admin.services.permission.findMany).not.toHaveBeenCalled();
      expect(mocks.permissionQuery.update).not.toHaveBeenCalled();
    });
  });

  describe('content-manager locale middleware', () => {
    const getMiddleware = async (path: string, options: Parameters<typeof setup>[0] = {}) => {
      const ctx = await runRegister(options);
      const calls = (ctx.strapi.server.router.use as jest.Mock).mock.calls as [
        string,
        RouterMiddleware,
      ][];
      const [, middleware] = calls.find(([routePath]) => routePath === path) ?? [];

      return { ...ctx, middleware: middleware as RouterMiddleware };
    };

    const collectionTypes = '/content-manager/collection-types/:model';
    const singleTypes = '/content-manager/single-types/:model';

    test('mounts on content-manager collection and single types routes', async () => {
      const { strapi } = await runRegister();

      expect((strapi.server.router.use as jest.Mock).mock.calls.map(([path]) => path)).toEqual([
        collectionTypes,
        singleTypes,
      ]);
    });

    test.each([collectionTypes, singleTypes])('skips GET requests on %s', async (path) => {
      const { middleware, strapi } = await getMiddleware(path);
      const next = jest.fn(() => 'next');
      const ctx = { method: 'GET', params: { model: ARTICLE_UID }, request: { query: {} } };

      expect(middleware(ctx, next)).toBe('next');
      expect(strapi.getModel).not.toHaveBeenCalled();
    });

    test.each([
      ['query', { locale: 'fr' }, { title: 'x' }, 'fr'],
      ['body', {}, { title: 'x', locale: 'fr' }, 'fr'],
      ['default locale', {}, { title: 'x' }, 'en'],
      ['default locale for an empty string', { locale: '' }, { locale: '' }, 'en'],
    ])('sets the body locale from the %s', async (_name, query, body, expected) => {
      const { middleware } = await getMiddleware(collectionTypes);
      const next = jest.fn();
      const ctx = {
        method: 'POST',
        params: { model: ARTICLE_UID },
        request: { query, body: { ...body } },
      };

      await middleware(ctx, next);

      expect(ctx.request.body).toMatchObject({ locale: expected });
      expect(ctx.request.query).toEqual({});
      expect(next).toHaveBeenCalledTimes(1);
    });

    test('creates the body when missing', async () => {
      const { middleware } = await getMiddleware(collectionTypes);
      const ctx = { method: 'PUT', params: { model: ARTICLE_UID }, request: { query: {} } };

      await middleware(ctx, jest.fn());

      expect(ctx.request).toEqual({ query: {}, body: { locale: 'en' } });
    });

    test('rejects unknown locales', async () => {
      const { middleware } = await getMiddleware(collectionTypes);
      const next = jest.fn();
      const ctx = {
        method: 'POST',
        params: { model: ARTICLE_UID },
        request: { query: { locale: 'xx' }, body: {} },
      };

      const result = Promise.resolve(middleware(ctx, next));

      await expect(result).rejects.toThrow(errors.ApplicationError);
      await expect(result).rejects.toThrow("This locale doesn't exist");
      expect(next).not.toHaveBeenCalled();
    });

    test('leaves non localized content types untouched', async () => {
      const { middleware } = await getMiddleware(collectionTypes);
      const next = jest.fn();
      const ctx = {
        method: 'POST',
        params: { model: TAG_UID },
        request: { query: { locale: 'fr' }, body: { name: 'x' } },
      };

      await middleware(ctx, next);

      expect(ctx.request).toEqual({ query: { locale: 'fr' }, body: { name: 'x' } });
      expect(next).toHaveBeenCalledTimes(1);
    });

    test.each([
      ['an existing', { id: 1 }],
      ['a missing', null],
    ])('looks up %s single type entry and keeps the locale in the query', async (_n, entity) => {
      const { middleware, strapi } = await getMiddleware(singleTypes, {
        singleTypeEntity: entity,
      });
      const next = jest.fn();
      const ctx = {
        method: 'PUT',
        params: { model: HOMEPAGE_UID },
        request: { query: { locale: 'fr' }, body: {} },
      };

      await middleware(ctx, next);

      expect(strapi.entityService.findMany).toHaveBeenCalledWith(HOMEPAGE_UID, { locale: 'fr' });
      expect(ctx.request).toEqual({ query: { locale: 'fr' }, body: { locale: 'fr' } });
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('graphql', () => {
    type Nexus = {
      scalarType: (config: UnknownRecord) => UnknownRecord;
      plugin: (config: UnknownRecord) => UnknownRecord;
      arg: (config: UnknownRecord) => UnknownRecord;
    };
    type ScalarConfig = UnknownRecord & { parseLiteral: (ast: UnknownRecord) => unknown };
    type PluginConfig = UnknownRecord & { onAddOutputField: (config: UnknownRecord) => void };
    type Extension = {
      plugins: PluginConfig[];
      types: ScalarConfig[];
      resolversConfig: UnknownRecord;
    };

    const nexus: Nexus = {
      scalarType: (config) => config,
      plugin: (config) => config,
      arg: (config) => ({ arg: config }),
    };

    const getExtension = async (registry: UnknownRecord = {}) => {
      const ctx = await runRegister({ withGraphql: true });
      const [factory] = ctx.graphql.extension.use.mock.calls[0];
      const extension: Extension = factory({
        nexus,
        typeRegistry: { get: (name: string) => registry[name] },
      });

      return { ...ctx, extension };
    };

    test('is not registered without the graphql plugin', async () => {
      const { graphql } = await runRegister({ withGraphql: false });

      expect(graphql.extension.shadowCRUD).not.toHaveBeenCalled();
      expect(graphql.extension.use).not.toHaveBeenCalled();
    });

    test('disables locale mutations and localization inputs of localized content types', async () => {
      const { graphql } = await runRegister({ withGraphql: true });

      expect(graphql.calls).toEqual([
        'plugin::i18n.locale disableMutations',
        `${ARTICLE_UID}.locale disableInput`,
        `${ARTICLE_UID}.localizations disableInput`,
        `${HOMEPAGE_UID}.locale disableInput`,
        `${HOMEPAGE_UID}.localizations disableInput`,
      ]);
    });

    test('extends the schema with the locale scalar, arg plugin and locale query scopes', async () => {
      const { extension } = await getExtension();

      expect(extension.types.map((type) => type.name)).toEqual(['I18NLocaleCode']);
      expect(extension.plugins.map((plugin) => plugin.name)).toEqual(['I18NLocaleArg']);
      expect(extension.resolversConfig).toEqual({
        'Query.i18NLocale': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
        'Query.i18NLocales': { auth: { scope: 'plugin::i18n.locales.listLocales' } },
      });
    });

    test('parses known iso locale codes and the wildcard', async () => {
      const { extension } = await getExtension();
      const [scalar] = extension.types;

      expect(scalar.parseLiteral({ kind: 'StringValue', value: 'fr' })).toBe('fr');
      expect(scalar.parseLiteral({ kind: 'StringValue', value: '*' })).toBe('*');
      expect(() => scalar.parseLiteral({ kind: 'StringValue', value: 'xx-XX' })).toThrow(
        'Unknown locale supplied'
      );
      expect(() => scalar.parseLiteral({ kind: 'IntValue', value: '1' })).toThrow(
        'Locale cannot represent non string type'
      );
    });

    describe('locale arg plugin', () => {
      const addOutputField = async (config: UnknownRecord, registry: UnknownRecord = {}) => {
        const { extension, contentTypes } = await getExtension(registry);
        const [plugin] = extension.plugins;
        plugin.onAddOutputField(config);

        return { config, contentTypes };
      };

      const localeArg = {
        arg: { type: 'I18NLocaleCode', description: 'The locale to use for the query' },
      };

      test('adds the locale arg to queries on localized content types', async () => {
        const { contentTypes } = await getExtension();
        const { config } = await addOutputField({
          parentType: 'Query',
          args: { id: 'ID' },
          extensions: { strapi: { contentType: contentTypes[ARTICLE_UID] } },
        });

        expect(config.args).toEqual({ id: 'ID', locale: localeArg });
      });

      test('resolves the content type from the type registry for mutations', async () => {
        const { contentTypes } = await getExtension();
        const { config } = await addOutputField(
          { parentType: 'Mutation', type: 'Article' },
          { Article: { config: { contentType: contentTypes[ARTICLE_UID] } } }
        );

        expect(config.args).toEqual({ locale: localeArg });
      });

      test.each([
        ['other parent types', { parentType: 'Article', type: 'Article' }],
        ['types missing from the registry', { parentType: 'Query', type: 'Unknown' }],
        ['non localized content types', { parentType: 'Query', type: 'Tag' }],
      ])('ignores %s', async (_name, config: UnknownRecord) => {
        const { contentTypes } = await getExtension();
        const result = await addOutputField(config, {
          Article: { config: { contentType: contentTypes[ARTICLE_UID] } },
          Tag: { config: { contentType: contentTypes[TAG_UID] } },
        });

        expect(result.config.args).toBe(undefined);
      });
    });
  });
});
