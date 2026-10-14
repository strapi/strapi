/**
 * Pins what `bootstrap({ strapi })` wires into strapi: default locale, permission actions, hooks and
 * handlers, model lifecycles, the document service middleware, audit events and AI localizations.
 * Handlers are captured from the strapi mock and called like core calls them.
 */
import {
  createStore,
  createStrapi,
  loadPluginServer,
  localizedModel,
  nonLocalizedModel,
  resetGlobalStrapi,
} from './resources/strapi';

type UnknownRecord = Record<string, unknown>;
type Handler = (...args: any[]) => unknown;
type DocumentsMiddleware = (
  context: { contentType: UnknownRecord; action: string; params: UnknownRecord },
  next: () => Promise<unknown>
) => Promise<unknown>;

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';

const article = localizedModel(ARTICLE_UID, {
  title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  price: { type: 'integer' },
});
// `getNestedPopulateOfNonLocalizedAttributes` keeps attributes that are scalar XOR non localized
const ARTICLE_POPULATE = ['title'];
const tag = nonLocalizedModel(TAG_UID, { name: { type: 'string' } });

const createHook = () => ({ register: jest.fn() });

const registered = (hook: { register: jest.Mock }): Handler => hook.register.mock.calls[0][0];

const setup = ({
  localesCount = 1,
  locales = [
    { id: 1, code: 'en', name: 'English (en)' },
    { id: 2, code: 'fr', name: 'French (fr)' },
  ],
  defaultLocale = 'en',
  existingActions = [] as UnknownRecord[],
  superAdmin = { id: 1 } as UnknownRecord | null,
  hasAuditLogs = false,
  aiAvailable = false,
  hasAIProvider = false,
  strapiManagedAI = false,
} = {}) => {
  const localeQuery = {
    count: jest.fn(async () => localesCount),
    create: jest.fn(async ({ data }: { data: UnknownRecord }) => ({ id: 10, ...data })),
    findMany: jest.fn(async () => locales),
    findOne: jest.fn(async ({ where }: { where: UnknownRecord }) => {
      return locales.find((locale) => locale.code === where.code) ?? null;
    }),
  };
  const contentQuery = { findOne: jest.fn() };
  const query = jest.fn((uid: string) =>
    uid === 'plugin::i18n.locale' ? localeQuery : contentQuery
  );

  const actionProvider = {
    registerMany: jest.fn(),
    appliesToProperty: jest.fn<Promise<boolean>, [string, string, string]>(async () => true),
    values: jest.fn(() => existingActions),
    hooks: { appliesPropertyToSubject: createHook(), willRegister: createHook() },
  };
  const permissionService = {
    actionProvider,
    sectionsBuilder: { addHandler: jest.fn() },
    engine: { hooks: { 'before-register.permission': createHook() } },
    findMany: jest.fn(async () => [
      { action: 'plugin::content-manager.explorer.read', subject: ARTICLE_UID, properties: {} },
    ]),
  };
  const roleService = {
    getSuperAdmin: jest.fn(async () => superAdmin),
    assignPermissions: jest.fn(),
    hasSuperAdminRole: jest.fn((user: { isSuperAdmin?: boolean }) => user.isSuperAdmin === true),
    hooks: {
      willResetSuperAdminPermissions: createHook(),
      willValidateUpdatePermissions: createHook(),
    },
  };

  const auditLogsLifecycle = { registerEvent: jest.fn() };
  const aiTranslations = {
    hasProvider: jest.fn(() => hasAIProvider),
    registerStrapiManagedProvider: jest.fn(),
  };
  const aiLocalizations = { setupMiddleware: jest.fn() };
  const localizations = { syncNonLocalizedAttributes: jest.fn() };
  const { store, values } = createStore({ default_locale: defaultLocale });

  const contentTypes: Record<string, UnknownRecord> = { [ARTICLE_UID]: article, [TAG_UID]: tag };

  const { strapi } = createStrapi(
    {
      contentTypes,
      components: {},
      getModel: jest.fn((uid: string) => contentTypes[uid]),
      db: { query, lifecycles: { subscribe: jest.fn() } },
      documents: Object.assign(jest.fn(), { use: jest.fn() }),
      store,
      telemetry: { send: jest.fn(async () => undefined) },
      eventHub: { emit: jest.fn(async () => undefined) },
      log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
      has: jest.fn((name: string) => name === 'audit-logs-lifecycle' && hasAuditLogs),
      get: jest.fn(() => auditLogsLifecycle),
      ai: {
        admin: {
          isAvailable: jest.fn(() => aiAvailable),
          isStrapiManagedAiEnabled: jest.fn(() => strapiManagedAI),
        },
      },
      admin: { services: { permission: permissionService, role: roleService } },
    },
    {
      i18nServices: {
        'ai-translations': aiTranslations,
        'ai-localizations': aiLocalizations,
        localizations,
      },
    }
  );

  return {
    strapi,
    mocks: {
      query,
      localeQuery,
      contentQuery,
      actionProvider,
      permissionService,
      roleService,
      auditLogsLifecycle,
      aiTranslations,
      aiLocalizations,
      localizations,
      storeValues: values,
    },
  };
};

const runBootstrap = async (options: Parameters<typeof setup>[0] = {}) => {
  const ctx = setup(options);

  await loadPluginServer().bootstrap({ strapi: ctx.strapi });

  return ctx;
};

describe('i18n bootstrap', () => {
  afterEach(() => {
    resetGlobalStrapi();
  });

  describe('default locale', () => {
    test('creates the default locale and stores it when no locale exists', async () => {
      const { strapi, mocks } = await runBootstrap({ localesCount: 0, defaultLocale: '' });

      expect(mocks.localeQuery.create).toHaveBeenCalledWith({
        data: { code: 'en', name: 'English (en)' },
      });
      expect(mocks.storeValues.get('default_locale')).toBe('en');
      expect(strapi.store).toHaveBeenCalledWith({ type: 'plugin', name: 'i18n' });
    });

    test('keeps existing locales', async () => {
      const { mocks } = await runBootstrap({ localesCount: 2 });

      expect(mocks.localeQuery.create).not.toHaveBeenCalled();
      expect(mocks.storeValues.get('default_locale')).toBe('en');
    });
  });

  test('sends the init telemetry event with the number of localized content types', async () => {
    const { strapi } = await runBootstrap();

    expect(strapi.telemetry.send).toHaveBeenCalledWith('didInitializeI18n', {
      groupProperties: { numberOfContentTypes: 1 },
    });
  });

  describe('permissions', () => {
    test('registers the locale settings actions', async () => {
      const { mocks } = await runBootstrap();

      const [actions] = mocks.actionProvider.registerMany.mock.calls[0];
      expect(actions.map((action: { uid: string }) => action.uid)).toEqual([
        'locale.create',
        'locale.read',
        'locale.update',
        'locale.delete',
      ]);
    });

    test('adds the locales property to content-types actions, registered or to come', async () => {
      const existingActions = [
        { section: 'contentTypes', options: { applyToProperties: ['fields'] } },
        { section: 'contentTypes', options: { applyToProperties: ['fields', 'locales'] } },
        { section: 'contentTypes', options: {} },
        { section: 'settings', options: {} },
      ];
      const { mocks } = await runBootstrap({ existingActions });

      expect(existingActions.map((action) => action.options)).toEqual([
        { applyToProperties: ['fields', 'locales'] },
        { applyToProperties: ['fields', 'locales'] },
        { applyToProperties: ['locales'] },
        {},
      ]);

      const willRegister = registered(mocks.actionProvider.hooks.willRegister);
      const nextAction = { section: 'contentTypes', options: { applyToProperties: undefined } };
      willRegister({ value: nextAction });
      expect(nextAction.options.applyToProperties).toEqual(['locales']);
    });

    test('applies the locales property only to localized subjects', async () => {
      const { mocks } = await runBootstrap();
      const applies = registered(mocks.actionProvider.hooks.appliesPropertyToSubject);

      expect(applies({ property: 'locales', subject: ARTICLE_UID })).toBe(true);
      expect(applies({ property: 'locales', subject: TAG_UID })).toBe(false);
      expect(applies({ property: 'fields', subject: TAG_UID })).toBe(true);
    });

    test('gives every locale to the super admin permissions on reset', async () => {
      const { mocks } = await runBootstrap();
      const willReset = registered(mocks.roleService.hooks.willResetSuperAdminPermissions);
      mocks.actionProvider.appliesToProperty.mockImplementation(
        async (_property, action) => action === 'read'
      );

      const result = await willReset([
        { action: 'read', subject: ARTICLE_UID, properties: { fields: ['title'] } },
        { action: 'plugin::i18n.locale.read', subject: null },
      ]);

      expect(result).toEqual([
        {
          action: 'read',
          subject: ARTICLE_UID,
          properties: { fields: ['title'], locales: ['en', 'fr'] },
        },
        { action: 'plugin::i18n.locale.read', subject: null },
      ]);
    });

    test('defaults missing locales to the default locale when role permissions are updated', async () => {
      const { mocks } = await runBootstrap();
      const willValidate = registered(mocks.roleService.hooks.willValidateUpdatePermissions);

      const result = await willValidate([
        { action: 'read', subject: ARTICLE_UID, properties: {} },
        { action: 'read', subject: TAG_UID, properties: {} },
      ]);

      expect(result).toEqual([
        { action: 'read', subject: ARTICLE_UID, properties: { locales: ['en'] } },
        { action: 'read', subject: TAG_UID, properties: {} },
      ]);
    });

    test('adds the locales property to the permissions layout of single and collection types', async () => {
      const { mocks } = await runBootstrap();
      const { addHandler } = mocks.permissionService.sectionsBuilder;

      expect(addHandler.mock.calls.map(([section]: [string]) => section)).toEqual([
        'singleTypes',
        'collectionTypes',
      ]);
      expect(addHandler.mock.calls[0][1]).toBe(addHandler.mock.calls[1][1]);

      const section = { subjects: [{ uid: ARTICLE_UID, properties: [] as UnknownRecord[] }] };
      await addHandler.mock.calls[0][1]({ action: { actionId: 'read' }, section });

      expect(section.subjects[0].properties).toEqual([
        {
          label: 'Locales',
          value: 'locales',
          children: [
            { label: 'English (en)', value: 'en', isDefault: true },
            { label: 'French (fr)', value: 'fr', isDefault: false },
          ],
        },
      ]);
    });

    describe('permission engine handler', () => {
      const register = async (permission: UnknownRecord, user: UnknownRecord = {}) => {
        const { mocks } = await runBootstrap();
        const willRegister = registered(
          mocks.permissionService.engine.hooks['before-register.permission']
        );
        const condition = { and: jest.fn() };

        await willRegister({ permission, condition, user });

        return condition.and;
      };

      test('restricts localized subjects to the permission locales', async () => {
        const and = await register({ subject: ARTICLE_UID, properties: { locales: ['fr'] } });

        expect(and).toHaveBeenCalledWith({ locale: { $in: ['fr'] } });
      });

      test('restricts to no locale when the permission has no locales property', async () => {
        const and = await register({ subject: ARTICLE_UID, properties: {} });

        expect(and).toHaveBeenCalledWith({ locale: { $in: [] } });
      });

      test.each([
        ['a super admin', { subject: ARTICLE_UID, properties: {} }, { isSuperAdmin: true }],
        ['no subject', { subject: null, properties: {} }, {}],
        ['a non localized subject', { subject: TAG_UID, properties: {} }, {}],
        ['null locales (all locales)', { subject: ARTICLE_UID, properties: { locales: null } }, {}],
      ])('adds no condition for %s', async (_name, permission, user) => {
        const and = await register(permission, user);

        expect(and).not.toHaveBeenCalled();
      });
    });
  });

  describe('locale lifecycles', () => {
    test.each(['afterCreate', 'afterDelete'])(
      '%s gives every locale to the super admin',
      async (lifecycle) => {
        const { strapi, mocks } = await runBootstrap();
        const [subscriber] = (strapi.db.lifecycles.subscribe as jest.Mock).mock.calls[0];

        expect(subscriber.models).toEqual(['plugin::i18n.locale']);

        await subscriber[lifecycle]();

        expect(mocks.permissionService.findMany).toHaveBeenCalledWith({
          where: { role: { id: 1 } },
        });
        expect(mocks.roleService.assignPermissions).toHaveBeenCalledWith(1, [
          {
            action: 'plugin::content-manager.explorer.read',
            subject: ARTICLE_UID,
            properties: { locales: ['en', 'fr'] },
          },
        ]);
      }
    );

    test('does nothing without a super admin role', async () => {
      const { strapi, mocks } = await runBootstrap({ superAdmin: null });
      const [subscriber] = (strapi.db.lifecycles.subscribe as jest.Mock).mock.calls[0];

      await subscriber.afterCreate();

      expect(mocks.roleService.assignPermissions).not.toHaveBeenCalled();
    });
  });

  describe('document service middleware', () => {
    const getMiddleware = async () => {
      const ctx = await runBootstrap();
      const [middleware] = (ctx.strapi.documents.use as jest.Mock).mock.calls[0] as [
        DocumentsMiddleware,
      ];

      return { ...ctx, middleware };
    };

    test.each(['findOne', 'findMany', 'delete', 'unpublish'])(
      'passes %s through',
      async (action) => {
        const { middleware, mocks } = await getMiddleware();
        const next = jest.fn(async () => 'result');

        await expect(
          middleware({ contentType: article, action, params: { documentId: 'doc' } }, next)
        ).resolves.toBe('result');
        expect(mocks.contentQuery.findOne).not.toHaveBeenCalled();
      }
    );

    test('passes non localized content types through', async () => {
      const { middleware, mocks } = await getMiddleware();
      const next = jest.fn(async () => ({ id: 1 }));

      await middleware({ contentType: tag, action: 'create', params: {} }, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(mocks.contentQuery.findOne).not.toHaveBeenCalled();
    });

    test('syncs non localized attributes of a created entry', async () => {
      const { middleware, mocks, strapi } = await getMiddleware();
      const populated = { id: 3, documentId: 'doc', locale: 'en', title: 'Hello', price: 10 };
      mocks.contentQuery.findOne.mockResolvedValue(populated);

      const result = await middleware(
        { contentType: article, action: 'create', params: {} },
        async () => ({ id: 3 })
      );

      expect(result).toEqual({ id: 3 });
      expect(strapi.db.query).toHaveBeenCalledWith(ARTICLE_UID);
      expect(mocks.contentQuery.findOne).toHaveBeenCalledTimes(1);
      expect(mocks.contentQuery.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        populate: ARTICLE_POPULATE,
      });
      expect(mocks.localizations.syncNonLocalizedAttributes).toHaveBeenCalledWith(
        populated,
        article
      );
    });

    test('syncs when a non localized attribute changed', async () => {
      const { middleware, mocks } = await getMiddleware();
      mocks.contentQuery.findOne
        .mockResolvedValueOnce({ id: 3, title: 'Hello', price: 10 })
        .mockResolvedValueOnce({ id: 3, title: 'Hello', price: 20 });

      await middleware(
        { contentType: article, action: 'update', params: { documentId: 'doc' } },
        async () => ({ id: 3 })
      );

      expect(mocks.contentQuery.findOne).toHaveBeenNthCalledWith(1, {
        where: { documentId: 'doc' },
        populate: ARTICLE_POPULATE,
      });
      expect(mocks.localizations.syncNonLocalizedAttributes).toHaveBeenCalledTimes(1);
    });

    test('skips the sync when only localized attributes changed', async () => {
      const { middleware, mocks } = await getMiddleware();
      mocks.contentQuery.findOne
        .mockResolvedValueOnce({ id: 3, title: 'Hello', price: 10 })
        .mockResolvedValueOnce({ id: 3, title: 'Bonjour', price: 10 });

      await middleware(
        { contentType: article, action: 'update', params: { documentId: 'doc' } },
        async () => ({ id: 3 })
      );

      expect(mocks.localizations.syncNonLocalizedAttributes).not.toHaveBeenCalled();
    });

    test('reads the entry id from publish results', async () => {
      const { middleware, mocks } = await getMiddleware();
      mocks.contentQuery.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 7 });

      await middleware(
        { contentType: article, action: 'publish', params: { documentId: 'doc' } },
        async () => ({ entries: [{ id: 7 }] })
      );

      expect(mocks.contentQuery.findOne).toHaveBeenLastCalledWith({
        where: { id: 7 },
        populate: ARTICLE_POPULATE,
      });
      expect(mocks.localizations.syncNonLocalizedAttributes).toHaveBeenCalledWith(
        { id: 7 },
        article
      );
    });

    test('returns results without an id untouched', async () => {
      const { middleware, mocks } = await getMiddleware();
      const empty = { entries: [] };

      await expect(
        middleware({ contentType: article, action: 'discardDraft', params: {} }, async () => empty)
      ).resolves.toBe(empty);
      expect(mocks.contentQuery.findOne).not.toHaveBeenCalled();
      expect(mocks.localizations.syncNonLocalizedAttributes).not.toHaveBeenCalled();
    });
  });

  describe('audit logs', () => {
    test('registers the locale audit events when the lifecycle service exists', async () => {
      const { strapi, mocks } = await runBootstrap({ hasAuditLogs: true });

      expect(strapi.get).toHaveBeenCalledWith('audit-logs-lifecycle');
      expect(mocks.auditLogsLifecycle.registerEvent).toHaveBeenCalled();
    });

    test('skips audit events when the lifecycle service is absent', async () => {
      const { strapi, mocks } = await runBootstrap({ hasAuditLogs: false });

      expect(strapi.get).not.toHaveBeenCalled();
      expect(mocks.auditLogsLifecycle.registerEvent).not.toHaveBeenCalled();
    });
  });

  describe('AI localizations', () => {
    test('stays off when AI is not available', async () => {
      const { mocks } = await runBootstrap({ aiAvailable: false, strapiManagedAI: true });

      expect(mocks.aiTranslations.registerStrapiManagedProvider).not.toHaveBeenCalled();
      expect(mocks.aiLocalizations.setupMiddleware).not.toHaveBeenCalled();
    });

    test('registers the Strapi managed provider when no provider exists', async () => {
      const { mocks } = await runBootstrap({ aiAvailable: true, strapiManagedAI: true });

      expect(mocks.aiTranslations.registerStrapiManagedProvider).toHaveBeenCalledTimes(1);
      expect(mocks.aiLocalizations.setupMiddleware).toHaveBeenCalledTimes(1);
    });

    test.each([
      ['a provider is registered', { hasAIProvider: true, strapiManagedAI: true }],
      ['Strapi managed AI is disabled', { hasAIProvider: false, strapiManagedAI: false }],
    ])('keeps the current provider when %s', async (_name, options) => {
      const { mocks } = await runBootstrap({ aiAvailable: true, ...options });

      expect(mocks.aiTranslations.registerStrapiManagedProvider).not.toHaveBeenCalled();
      expect(mocks.aiLocalizations.setupMiddleware).toHaveBeenCalledTimes(1);
    });
  });
});
