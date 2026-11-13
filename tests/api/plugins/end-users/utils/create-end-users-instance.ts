import fs from 'node:fs';
import path from 'node:path';
import type { Core } from '@strapi/types';
import { createStrapiInstance } from 'api-tests/strapi';
import { importEsm } from './import-esm';
import { extendProfile } from './extend-profile';
import { clearSentEmails, init as initCaptureProvider } from './email-capture-provider';
import type { FakeOidc } from './fake-oidc';

export const TEST_SECRET = 'test-secret-at-least-32-characters-long';

/** `admin.secrets.encryptionKey`, which the providers' secrets are encrypted with. */
export const TEST_ENCRYPTION_KEY = 'end-users-test-encryption-key';

/**
 * What the plugin `require()`s that is an ES module. Node 22.12 and later can do that, which is why
 * the plugin does it (it needs no `import()`), but Jest cannot: its own `require()` refuses an
 * ES module ("Must use import to load ES Module") however new the Node under it is.
 *
 * So the harness loads each of them with a real `import()`, which Jest does support (the runner
 * starts it with --experimental-vm-modules), and answers the plugin's `require()` with the loaded
 * module. They are the same module instances Better Auth's own imports see, so nothing is loaded
 * twice. This is test plumbing only: the plugin's code does not change for it.
 */
const ESM_DEPENDENCIES = [
  '@better-auth/core/context',
  // Its CommonJS build requires `@noble/hashes`, an ES module
  '@better-auth/utils/otp',
  'better-auth/adapters',
  'better-auth/api',
  'better-auth/crypto',
  'better-auth/db',
  'better-auth/minimal',
  'better-auth/plugins',
  '@better-auth/passkey',
];

const bridgeEsmDependencies = async () => {
  for (const specifier of ESM_DEPENDENCIES) {
    // eslint-disable-next-line no-await-in-loop
    const loaded = await importEsm(specifier);

    jest.doMock(specifier, () => loaded);
  }
};

const CONFIG_GLOBAL = '__END_USERS_TEST_PLUGINS_CONFIG__';

// Strapi `require`s config/plugins.js, and Jest caches that module for the whole test file, so a
// second instance would silently get the first instance's config. The file therefore stays the same
// and returns whatever config the current instance registered on the global. Going through a
// global also lets `pluginConfig` carry functions (callbacks, hooks), which JSON would drop.
//
// When the global is not set (a run that died before `destroy()` put the original file back, and
// left this stub behind) the file returns `{}`: Strapi reads the return value as the plugins config,
// and `undefined` would break the next boot of the app with a TypeError instead of an empty config.
const PLUGINS_CONFIG_MODULE = `module.exports = () => globalThis.${CONFIG_GLOBAL} ?? {};\n`;

/** What the stub module exports, for the mock below. */
const pluginsConfigStub = () =>
  ((globalThis as Record<string, unknown>)[CONFIG_GLOBAL] as Record<string, unknown>) ?? {};

export interface CreateEndUsersInstanceOptions {
  /**
   * Merged over the default plugin config (`{ secret: TEST_SECRET, rateLimit: { enabled: false } }`).
   * Rate limiting is on by default in the plugin and off here, so a test that signs in many times
   * from one address is not limited: a test that is about the limit turns it on with
   * `rateLimit: { enabled: true, ... }`. A `rateLimit` given here is merged key by key.
   */
  pluginConfig?: Record<string, unknown>;
  /** Runs before the Strapi modules bootstrap (same hook as `createStrapiInstance`'s `bootstrap`). */
  bootstrap?: (args: { strapi: Core.Strapi }) => Promise<void>;
  /**
   * Runs before Strapi registers its modules (same hook as `createStrapiInstance`'s `register`): the
   * place to change the configuration the server is built from, for example `middlewares`.
   */
  register?: (args: { strapi: Core.Strapi }) => Promise<void>;
  /**
   * A test builder (`createTestBuilder()`) whose content types relate to the end user. It is built
   * before the instance starts and cleaned up after `strapi.destroy()`, both while the plugin is
   * enabled: the Content-Type Builder refuses a relation to `plugin::end-users.user` in an app that
   * doesn't have it, and an app whose types have such a relation doesn't start without it. The
   * builder's own Strapi instances therefore load the plugin too.
   */
  builder?: { build(): Promise<unknown>; cleanup(): Promise<unknown> };
  /**
   * Project attributes for `plugin::end-users.profile` (see `extendProfile`), applied after the
   * builder has built its types: a relation's target has to exist when the profile is built, and
   * the builder's own instances boot before the target does. Put back by `strapi.destroy()`,
   * before the builder cleans up.
   */
  profileAttributes?: Record<string, unknown>;
  /**
   * A running fake OpenID Connect issuer (`startFakeOidc()`, started before the instance so its
   * address can go in `pluginConfig`). OAuth is the one thing here with a server of its own, so
   * its lifecycle is the instance's: `strapi.destroy()` stops it, and so does a failed start.
   */
  fakeOidc?: FakeOidc;
}

/**
 * Boots the generated API test app with `@strapi/plugin-end-users` enabled and
 * `@strapi/plugin-users-permissions` disabled.
 *
 * The app's `config/plugins.js` is replaced for the lifetime of the instance and put back (or
 * removed, if the app had none) by `strapi.destroy()`. Tests that run in the same generated app
 * therefore see the file they expect. One instance at a time per test file: destroy it before
 * creating the next. A plain instance in the same file (a test builder's, say) may come before
 * or after it, as long as the two are not up at the same time.
 *
 * Content API auth is NOT bypassed (unlike the `createStrapiInstance` default): the plugin's own
 * auth strategy is what these tests exercise, and the bypass strategy would answer first.
 */
export const createEndUsersInstance = async (
  opts: CreateEndUsersInstanceOptions = {}
): Promise<Core.Strapi> => {
  if (!process.env.ENV_PATH) {
    throw new Error('ENV_PATH is not set: run this through `yarn test:api`');
  }

  await bridgeEsmDependencies();

  const configDir = path.join(path.dirname(process.env.ENV_PATH), 'config');
  const pluginsConfigPath = path.join(configDir, 'plugins.js');

  const originalConfig = fs.existsSync(pluginsConfigPath)
    ? fs.readFileSync(pluginsConfigPath, 'utf8')
    : null;

  const restoreConfig = () => {
    delete (globalThis as Record<string, unknown>)[CONFIG_GLOBAL];
    jest.dontMock(pluginsConfigPath);

    if (originalConfig !== null) {
      fs.writeFileSync(pluginsConfigPath, originalConfig);
    } else if (fs.existsSync(pluginsConfigPath)) {
      fs.unlinkSync(pluginsConfigPath);
    }
  };

  const pluginsConfig = {
    'users-permissions': { enabled: false },
    'end-users': {
      enabled: true,
      // The generated API test app does not list the plugin as a dependency, so point Strapi at
      // the workspace package explicitly (otherwise: "end-users is not installed").
      resolve: require.resolve('@strapi/plugin-end-users/package.json'),
      config: {
        secret: TEST_SECRET,
        // Not asked for: a test that is about the migration sets its own
        migration: { fromUsersPermissions: false },
        ...opts.pluginConfig,
        rateLimit: { enabled: false, ...(opts.pluginConfig?.rateLimit as object | undefined) },
      },
    },
  };

  (globalThis as Record<string, unknown>)[CONFIG_GLOBAL] = pluginsConfig;

  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(pluginsConfigPath, PLUGINS_CONFIG_MODULE);

  // The file is there for Strapi to find, but what it loads is this mock: a plain instance booted
  // earlier in the same test file (a test builder boots one to create its content types) has put
  // the app's own config/plugins.js in Jest's module cache, and Jest would answer with that one,
  // never reading the stub. A mock comes before the cache.
  jest.doMock(pluginsConfigPath, () => pluginsConfigStub);

  let strapi: Core.Strapi;
  let restoreProfile: (() => void) | undefined;

  try {
    // One plain instance at a time, each destroyed before the next: the builder's come first
    await opts.builder?.build();

    if (opts.profileAttributes) {
      restoreProfile = extendProfile(opts.profileAttributes);
    }

    strapi = await createStrapiInstance({
      bootstrap: opts.bootstrap,
      register: opts.register,
      bypassAuth: false,
    });
  } catch (error) {
    // A start that failed or was refused has still run every plugin's register: destroy what it
    // built, or module-level registries (admin's actions and conditions, which an Enterprise plugin
    // fills in its register) keep its entries and the next instance in this file fails on duplicates
    const halfBooted = (globalThis as { strapi?: Core.Strapi }).strapi;
    await halfBooted?.destroy().catch(() => undefined);
    restoreProfile?.();
    restoreConfig();
    await opts.fakeOidc?.stop();
    throw error;
  }

  // Provider secrets are stored encrypted, which needs a key
  strapi.config.set('admin.secrets.encryptionKey', TEST_ENCRYPTION_KEY);

  // Every email goes to the capture provider: read them with `sentEmails()` from
  // `./email-capture-provider`. Installed on the booted plugin, not named in the email config: the
  // email plugin lower-cases a provider name, and a path to this file has capitals in it.
  strapi.plugin('email').provider = initCaptureProvider();
  clearSentEmails();

  const destroy = strapi.destroy.bind(strapi);

  strapi.destroy = async () => {
    try {
      await destroy();
      restoreProfile?.();
      await opts.builder?.cleanup();
    } finally {
      await opts.fakeOidc?.stop();
      restoreProfile?.();
      restoreConfig();
    }
  };

  return strapi;
};
