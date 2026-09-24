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
];
checks satisfies unknown;
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
