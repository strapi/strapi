import type { Core } from '@strapi/strapi';
// Generated `plugins.d.ts` loads the declarations of the JavaScript users-permissions plugin.
import type {} from '@strapi/plugin-users-permissions/strapi-server';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::default-semantics': {
          port?: number | null;
          options?: { enabled: boolean };
        };
      }
    }
  }
}

declare const app: Core.Strapi;
declare const maybePort: number | undefined;

// Keep inference independent from the assertions below.
const port = app.config.get('plugin::default-semantics.port', 1337);
const pluginPort = app.plugin('default-semantics').config('port', 1337);
const noDefault = app.config.get('plugin::default-semantics.port');
const pluginNoDefault = app.plugin('default-semantics').config('port');
const optionalDefault = app.config.get('plugin::default-semantics.port', maybePort);
const pluginOptionalDefault = app.plugin('default-semantics').config('port', maybePort);
const undefinedDefault = app.config.get('plugin::default-semantics.port', undefined);
const pluginUndefinedDefault = app.plugin('default-semantics').config('port', undefined);
const nestedDefault = app.config.get('plugin::default-semantics.options.enabled', false);
const pluginNestedDefault = app.plugin('default-semantics').config('options.enabled', false);
const explicitDefault = app.config.get<number>('plugin::default-semantics.port', 1337);
const explicitPluginDefault = app.plugin('default-semantics').config<number>('port', 1337);
declare const conditionalDefaults: [] | [number];
declare const optionalDefaults: [number?];
const conditionalDefault = app.config.get('plugin::default-semantics.port', ...conditionalDefaults);
const pluginConditionalDefault = app
  .plugin('default-semantics')
  .config('port', ...conditionalDefaults);
const optionalSpreadDefault = app.config.get('plugin::default-semantics.port', ...optionalDefaults);
const pluginOptionalSpreadDefault = app
  .plugin('default-semantics')
  .config('port', ...optionalDefaults);
const explicitTupleDefault = app.config.get<
  unknown,
  'plugin::default-semantics.port',
  [] | [number]
>('plugin::default-semantics.port');
const pluginExplicitTupleDefault = app
  .plugin('default-semantics')
  .config<unknown, 'port', [] | [number]>('port');
const fallbackBoolean = app.config.get('unregistered.flag', false);
const fallbackString = app.config.get('unregistered.label', 'fallback');
const fallbackNumber = app.config.get('unregistered.limit', 42);
const pluginFallbackBoolean = app.plugin('unregistered').config('enabled', false);
const pluginFallbackString = app.plugin('unregistered').config('label', 'fallback');
const pluginFallbackNumber = app.plugin('unregistered').config('limit', 42);
const fallbackObject = app.config.get('unregistered.options', { enabled: false });
const pluginFallbackArray = app.plugin('unregistered').config('labels', ['first']);
fallbackObject.enabled = true;
pluginFallbackArray.push('second');
// Unregistered defaults widen primitive literals (the result type is `NoInfer`), so mutable use sites compile.
let reassignedPort = app.config.get('server.port', 1337);
reassignedPort = 4000;
let reassignedPluginPort = app.plugin('unregistered').config('port', 1337);
reassignedPluginPort = 4000;
let reassignedEnabled = app.config.get('unregistered.enabled', false);
reassignedEnabled = true;
const mutableOptions = { port: app.config.get('server.port', 1337) };
mutableOptions.port = 4000;
const mutableLabels = [app.config.get('unregistered.label', 'first')];
mutableLabels.push('second');
[reassignedPort, reassignedPluginPort, reassignedEnabled] satisfies unknown;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
declare const checks: [
  Expect<Equal<typeof port, number | null>>,
  Expect<Equal<typeof pluginPort, number | null>>,
  Expect<Equal<typeof noDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginNoDefault, number | null | undefined>>,
  Expect<Equal<typeof optionalDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginOptionalDefault, number | null | undefined>>,
  Expect<Equal<typeof undefinedDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginUndefinedDefault, number | null | undefined>>,
  Expect<Equal<typeof nestedDefault, boolean>>,
  Expect<Equal<typeof pluginNestedDefault, boolean>>,
  Expect<Equal<typeof explicitDefault, number>>,
  Expect<Equal<typeof explicitPluginDefault, number>>,
  Expect<Equal<typeof conditionalDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginConditionalDefault, number | null | undefined>>,
  Expect<Equal<typeof optionalSpreadDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginOptionalSpreadDefault, number | null | undefined>>,
  Expect<Equal<typeof explicitTupleDefault, number | null | undefined>>,
  Expect<Equal<typeof pluginExplicitTupleDefault, number | null | undefined>>,
  Expect<Equal<typeof fallbackBoolean, boolean>>,
  Expect<Equal<typeof fallbackString, string>>,
  Expect<Equal<typeof fallbackNumber, number>>,
  Expect<Equal<typeof pluginFallbackBoolean, boolean>>,
  Expect<Equal<typeof pluginFallbackString, string>>,
  Expect<Equal<typeof pluginFallbackNumber, number>>,
  Expect<Equal<typeof fallbackObject, { enabled: boolean }>>,
  Expect<Equal<typeof pluginFallbackArray, string[]>>,
];
checks satisfies unknown;
const forwardDefault = <T>(key: string, value: T): T => app.config.get<T>(key, value);
const forwardPluginDefault = <T>(key: string, value: T): T =>
  app.plugin('unregistered').config<T>(key, value);
forwardDefault<void>('unregistered', undefined) satisfies void;
forwardPluginDefault<unknown>('unregistered', undefined) satisfies unknown;
// @ts-expect-error A required default tuple cannot be omitted, even with explicit type arguments.
app.config.get<unknown, 'plugin::default-semantics.port', [number]>(
  'plugin::default-semantics.port'
);
// @ts-expect-error Plugin config also requires the explicitly promised default.
app.plugin('default-semantics').config<unknown, 'port', [number]>('port');
// @ts-expect-error Defaults must match the registered value.
app.config.get('plugin::default-semantics.port', '1337');
// @ts-expect-error Plugin defaults must match the registered value.
app.plugin('default-semantics').config('port', '1337');
// @ts-expect-error A contextual result must not erase undefined when no default was supplied.
app.config.get('plugin::default-semantics.options.enabled') satisfies boolean;
// @ts-expect-error Plugin lookups also preserve undefined when no default was supplied.
app.plugin('default-semantics').config('options.enabled') satisfies boolean;

// Core namespaces without loader defaults are `undefined` when the app has no config file.
const features = app.config.get('features');
const middlewares = app.config.get('middlewares');
const middlewaresWithDefault = app.config.get('middlewares', ['strapi::logger']);
// @ts-expect-error `config/features.*` may be missing.
void features.future;
// @ts-expect-error `config/middlewares.*` may be missing.
void middlewares.length;
features?.future satisfies object | undefined;
middlewaresWithDefault.length satisfies number;

// Root keys set at startup are registered too.
app.config.get('environment') satisfies string;
app.config.get('autoReload') satisfies boolean;
app.config.get('info.strapi') satisfies string;
app.config.get('dirs.app.root') satisfies string;
const uuid = app.config.get('uuid');
// @ts-expect-error `package.json` may have no `strapi.uuid`.
uuid satisfies string;

// JavaScript plugins register their config through declaration files.
app.config.get('plugin::users-permissions.jwtManagement') satisfies 'legacy-support' | 'refresh';
app.plugin('users-permissions').config('sessions.accessTokenLifespan') satisfies number;
