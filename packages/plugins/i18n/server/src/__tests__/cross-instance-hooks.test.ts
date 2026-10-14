/**
 * Admin keeps the role hooks, the action provider, the permission engine and the sections builder
 * at module level (`admin/server/src/services/role.ts`, `services/permission.ts`): they live as long
 * as the process, and admin `destroy` only clears the registered actions and conditions, not the
 * hooks. i18n registers handlers there in `bootstrap`. Pins that, once an instance is destroyed and a
 * new one boots in the same process (API tests: `builder.build()` then `createStrapiInstance()`),
 * those handlers serve the new instance.
 */
import { hooks } from '@strapi/utils';
import { createStore, createStrapi, localizedModel, resetGlobalStrapi } from './resources/strapi';

type UnknownRecord = Record<string, unknown>;
type Locale = { id: number; code: string; name: string };

const ARTICLE_UID = 'api::article.article';
const READ_ACTION = 'plugin::content-manager.explorer.read';

/**
 * Mirrors the admin module-level state: created once per process and shared by every instance.
 */
const createAdminModuleState = () => {
  const sections = {
    singleTypes: hooks.createAsyncSeriesHook(),
    collectionTypes: hooks.createAsyncSeriesHook(),
  };

  const actionProvider = {
    hooks: {
      willRegister: hooks.createAsyncSeriesHook(),
      appliesPropertyToSubject: hooks.createAsyncParallelHook(),
    },
    registerMany: jest.fn(async () => undefined),
    values: jest.fn(() => []),
    async appliesToProperty(property: string, action: string, subject: string) {
      const results = await actionProvider.hooks.appliesPropertyToSubject.call({
        property,
        action,
        subject,
      });

      return results.every((result: unknown) => result !== false);
    },
  };

  const permission = {
    actionProvider,
    engine: { hooks: { 'before-register.permission': hooks.createAsyncSeriesHook() } },
    sectionsBuilder: {
      addHandler(name: keyof typeof sections, handler: (...args: any[]) => unknown) {
        sections[name].register(handler);
      },
    },
  };

  const role = {
    hooks: {
      willResetSuperAdminPermissions: hooks.createAsyncSeriesWaterfallHook(),
      willValidateUpdatePermissions: hooks.createAsyncSeriesWaterfallHook(),
    },
    hasSuperAdminRole: jest.fn((user: { isSuperAdmin?: boolean }) => user.isSuperAdmin === true),
  };

  return { permission, role, sections };
};

type AdminModuleState = ReturnType<typeof createAdminModuleState>;

/**
 * Boots an instance through the plugin entry like core (`register` then `bootstrap`, the instance
 * assigned to `global.strapi` as `createStrapi` does). Once destroyed, any read on the instance
 * throws, like queries on a destroyed database connection.
 */
const bootInstance = async (
  name: string,
  admin: AdminModuleState,
  { locales, defaultLocale }: { locales: Locale[]; defaultLocale: string }
) => {
  let destroyed = false;

  const contentTypes: Record<string, UnknownRecord> = {
    [ARTICLE_UID]: localizedModel(ARTICLE_UID, { title: { type: 'string' } }),
  };
  const localeQuery = {
    count: jest.fn(async () => locales.length),
    findMany: jest.fn(async () => locales),
  };
  const { store } = createStore({ default_locale: defaultLocale });

  const target: UnknownRecord = {
    contentTypes,
    components: {},
    getModel: jest.fn((uid: string) => contentTypes[uid]),
    localization: { register: jest.fn() },
    get: jest.fn(() => ({ add: jest.fn() })),
    has: jest.fn(() => false),
    hook: jest.fn(() => ({ register: jest.fn() })),
    server: { router: { use: jest.fn() } },
    db: {
      query: jest.fn(() => localeQuery),
      lifecycles: { subscribe: jest.fn() },
      metadata: { identifiers: { getTableName: jest.fn((table: string) => table) } },
    },
    documents: { use: jest.fn() },
    store,
    telemetry: { send: jest.fn(async () => undefined) },
    log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
    ai: { admin: { isAvailable: jest.fn(() => false) } },
    admin: { services: { permission: admin.permission, role: admin.role } },
  };

  const mock = new Proxy(target, {
    get(object, property, receiver) {
      if (destroyed === true) {
        throw new Error(`Strapi instance ${name} used after destroy (read "${String(property)}")`);
      }

      return Reflect.get(object, property, receiver);
    },
  });

  const { strapi, pluginServer } = createStrapi(mock);

  await pluginServer.register({ strapi });
  await pluginServer.bootstrap({ strapi });

  return {
    destroy() {
      destroyed = true;
    },
  };
};

const bootDestroyAndReboot = async () => {
  const admin = createAdminModuleState();

  const instanceA = await bootInstance('A', admin, {
    locales: [{ id: 1, code: 'en', name: 'English (en)' }],
    defaultLocale: 'en',
  });
  instanceA.destroy();

  await bootInstance('B', admin, {
    locales: [
      { id: 1, code: 'fr', name: 'French (fr)' },
      { id: 2, code: 'de', name: 'German (de)' },
    ],
    defaultLocale: 'fr',
  });

  return admin;
};

describe('i18n permission hooks across strapi instances', () => {
  afterEach(() => {
    resetGlobalStrapi();
  });

  test('resetting super admin permissions adds the locales of the current instance', async () => {
    const admin = await bootDestroyAndReboot();

    const permissions = await admin.role.hooks.willResetSuperAdminPermissions.call([
      { action: READ_ACTION, subject: ARTICLE_UID, properties: {} },
    ]);

    expect(permissions).toEqual([
      { action: READ_ACTION, subject: ARTICLE_UID, properties: { locales: ['fr', 'de'] } },
    ]);
  });

  test('validating role permissions uses the default locale of the current instance', async () => {
    const admin = await bootDestroyAndReboot();

    const permissions = await admin.role.hooks.willValidateUpdatePermissions.call([
      { action: READ_ACTION, subject: ARTICLE_UID, properties: {} },
    ]);

    expect(permissions).toEqual([
      { action: READ_ACTION, subject: ARTICLE_UID, properties: { locales: ['fr'] } },
    ]);
  });

  test('the locales property applies to subjects of the current instance', async () => {
    const admin = await bootDestroyAndReboot();

    await expect(
      admin.permission.actionProvider.appliesToProperty('locales', READ_ACTION, ARTICLE_UID)
    ).resolves.toBe(true);
  });

  test('the permission engine handler restricts to locales on the current instance', async () => {
    const admin = await bootDestroyAndReboot();
    const condition = { and: jest.fn() };

    await admin.permission.engine.hooks['before-register.permission'].call({
      permission: { subject: ARTICLE_UID, properties: { locales: ['fr'] } },
      condition,
      user: { isSuperAdmin: false },
    });

    expect(condition.and).toHaveBeenCalledWith({ locale: { $in: ['fr'] } });
  });

  test('the sections builder handler lists the locales of the current instance', async () => {
    const admin = await bootDestroyAndReboot();
    const subject = { uid: ARTICLE_UID, properties: [] as UnknownRecord[] };

    await admin.sections.collectionTypes.call({
      action: { actionId: READ_ACTION },
      section: { subjects: [subject] },
    });

    expect(subject.properties).toEqual([
      {
        label: 'Locales',
        value: 'locales',
        children: [
          { label: 'French (fr)', value: 'fr', isDefault: true },
          { label: 'German (de)', value: 'de', isDefault: false },
        ],
      },
    ]);
  });
});
