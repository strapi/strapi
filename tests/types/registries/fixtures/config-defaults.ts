import type { Core } from '@strapi/strapi';

declare global {
  namespace Strapi {
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
];
checks satisfies unknown;
// @ts-expect-error Defaults must match the registered value.
app.config.get('plugin::default-semantics.port', '1337');
// @ts-expect-error Plugin defaults must match the registered value.
app.plugin('default-semantics').config('port', '1337');
// @ts-expect-error A contextual result must not erase undefined when no default was supplied.
app.config.get('plugin::default-semantics.options.enabled') satisfies boolean;
// @ts-expect-error Plugin lookups also preserve undefined when no default was supplied.
app.plugin('default-semantics').config('options.enabled') satisfies boolean;
