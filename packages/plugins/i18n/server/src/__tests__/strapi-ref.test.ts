/**
 * The plain-object controllers read `strapi` from a plugin-scoped binding. These tests pin which
 * instance they get: the one core handed to the plugin (`register`, `bootstrap`, service factories)
 * over a different global, and the global when nothing was bound. Core is mirrored like in
 * plugin-shape.test.ts: the entry is spread, handed to the user extension, then services and
 * controllers are resolved with `{ strapi }`.
 */
import type { Core } from '@strapi/types';
import { getStrapi, resetStrapiBinding } from '../utils/strapi-ref';
import {
  createCtx,
  createStrapi,
  loadPluginServer,
  resetGlobalStrapi,
  resolveWithStrapi,
} from './resources/strapi';
import type { PluginServer } from './resources/strapi';

type UnknownRecord = Record<string, unknown>;
type Action = (ctx: ReturnType<typeof createCtx>) => unknown;
type UserExtension = (plugin: PluginServer) => PluginServer;

/**
 * Any access returns a callable stub, so `register` and `bootstrap` can run without a real instance.
 */
const createStub = (): unknown =>
  new Proxy(() => {}, {
    get: (_target, prop) => (prop === 'then' ? undefined : createStub()),
    apply: () => createStub(),
  });

const isoLocalesOf = (label: string) => [{ code: label, name: label }];

const setupApp = () => {
  const { strapi } = createStrapi(
    {},
    { i18nServices: { 'iso-locales': { getIsoLocales: jest.fn(() => isoLocalesOf('app')) } } }
  );
  // The unit setup's `plugin()` reads whichever instance is global: keep this instance's own
  Object.assign(strapi, { plugin: (name: string) => strapi.plugins[name] });

  return strapi;
};

const setGlobalDecoy = () => {
  global.strapi = {
    plugins: {
      i18n: {
        services: { 'iso-locales': { getIsoLocales: jest.fn(() => isoLocalesOf('decoy')) } },
      },
    },
  } as unknown as Core.Strapi;

  return global.strapi;
};

const loadPluginLikeCore = (extension?: UserExtension) => {
  const plugin = { ...loadPluginServer() };

  return extension === undefined ? plugin : extension(plugin);
};

const servedAction = (plugin: PluginServer, handler: string, strapi: Core.Strapi) => {
  const [controllerName, actionName] = handler.split('.');
  const controller = resolveWithStrapi<Record<string, Action>>(
    plugin.controllers[controllerName],
    strapi
  );

  return controller[actionName];
};

const listIsoLocales = async (plugin: PluginServer, strapi: Core.Strapi) => {
  const ctx = createCtx();
  await servedAction(plugin, 'iso-locales.listIsoLocales', strapi)(ctx);

  return ctx.body;
};

const replaceRegister: UserExtension = (p) => {
  p.register = jest.fn();
  return p;
};

describe('i18n plugin-scoped strapi binding', () => {
  beforeEach(() => {
    resetStrapiBinding();
  });

  afterEach(() => {
    resetStrapiBinding();
    resetGlobalStrapi();
  });

  test('falls back to the global strapi when nothing is bound', async () => {
    const app = setupApp();
    const plugin = loadPluginLikeCore();

    expect(getStrapi()).toBe(app);
    expect(await listIsoLocales(plugin, app)).toEqual(isoLocalesOf('app'));
  });

  test('register binds the instance it receives over a different global', async () => {
    const plugin = loadPluginLikeCore();
    const registered = createStub() as Core.Strapi;

    await plugin.register({ strapi: registered });
    const decoy = setGlobalDecoy();

    expect(getStrapi()).toBe(registered);
    expect(getStrapi()).not.toBe(decoy);
  });

  test('bootstrap binds the instance it receives when an extension replaces register', async () => {
    const plugin = loadPluginLikeCore(replaceRegister);
    const bootstrapped = createStub() as Core.Strapi;

    await plugin.register({ strapi: bootstrapped });
    setGlobalDecoy();
    await plugin.bootstrap({ strapi: bootstrapped });

    expect(getStrapi()).toBe(bootstrapped);
  });

  test('a service factory binds the instance when an extension replaces register', async () => {
    const app = setupApp();
    const plugin = loadPluginLikeCore(replaceRegister);

    await plugin.register({ strapi: app });
    const decoy = setGlobalDecoy();
    expect(getStrapi()).toBe(decoy);

    // `initRouting` resolves `ai-localization-jobs.*` handlers: the controller factory instantiates
    // the `ai-localization-jobs` service through the registry
    servedAction(plugin, 'ai-localization-jobs.getJobForSingleType', app);

    expect(getStrapi()).toBe(app);
    expect(await listIsoLocales(plugin, app)).toEqual(isoLocalesOf('app'));
  });

  test('still serves a controller action patched by an extension', async () => {
    const app = setupApp();
    const patched = jest.fn();
    const plugin = loadPluginLikeCore((p) => {
      (p.controllers['iso-locales'] as UnknownRecord).listIsoLocales = patched;
      return replaceRegister(p);
    });

    await plugin.register({ strapi: app });

    expect(servedAction(plugin, 'iso-locales.listIsoLocales', app)).toBe(patched);
  });
});
