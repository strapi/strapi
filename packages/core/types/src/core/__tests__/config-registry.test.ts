import type { Plugin } from '../plugin';
import type { ConfigProvider, Strapi as StrapiInstance } from '../strapi';

type LabConfig = {
  enabled: boolean;
  limit: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        'plugin::config-lab': { enabled: string; defaultOnly: true };
        'plugin::config-lab-default': LabConfig;
        'plugin::config-lab-nested': {
          provider: { name: string; options?: { port: number } | null };
          nullable?: number | null;
          items: { port: number }[];
          pair: readonly [{ port: number }, { host: string }];
        };
      }

      interface AppConfigs {
        'plugin::config-lab': LabConfig;
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicPlugin: string;
declare const dynamicKey: string;
// Results are assigned before `satisfies` so that the asserted type cannot be inferred from context.

// Full namespace lookups resolve the registered contract.
const namespaceConfig = strapi.config.get('plugin::config-lab');
namespaceConfig satisfies LabConfig;
const namespaceLimit = strapi.config.get('plugin::config-lab').limit;
namespaceLimit satisfies number;
const defaultEnabled = strapi.config.get('plugin::config-lab-default').enabled;
defaultEnabled satisfies boolean;
const namespaceWithDefault = strapi.config.get('plugin::config-lab', { enabled: true, limit: 1 });
namespaceWithDefault satisfies LabConfig;
// @ts-expect-error Registered contracts reject nonexistent keys.
strapi.config.get('plugin::config-lab').missing satisfies unknown;
// @ts-expect-error Default values must match the registered contract.
strapi.config.get('plugin::config-lab', { enabled: 'yes', limit: 1 });
// Plugin-scoped lookups resolve a key of the registered contract.
const pluginLimit = strapi.plugin('config-lab').config('limit');
pluginLimit satisfies number;
const pluginDefaultEnabled = strapi.plugin('config-lab-default').config('enabled');
pluginDefaultEnabled satisfies boolean;
const pluginLimitWithDefault = strapi.plugin('config-lab').config('limit', 10);
pluginLimitWithDefault satisfies number;
// @ts-expect-error Plugin-scoped lookups preserve the registered value type.
strapi.plugin('config-lab').config('limit') satisfies string;
// @ts-expect-error Plugin-scoped default values must match the registered value type.
strapi.plugin('config-lab').config('limit', 'ten');
// Dotted paths resolve inside the registered contract, like lodash `get`.
const dottedLimit = strapi.config.get('plugin::config-lab.limit');
dottedLimit satisfies number;
const nestedProviderName = strapi.config.get('plugin::config-lab-nested.provider.name');
nestedProviderName satisfies string;
const nestedOptionalPort = strapi.config.get('plugin::config-lab-nested.provider.options.port');
nestedOptionalPort satisfies number | undefined;
const pluginNestedProviderName = strapi.plugin('config-lab-nested').config('provider.name');
pluginNestedProviderName satisfies string;
const pluginNestedOptions = strapi.plugin('config-lab-nested').config('provider.options');
pluginNestedOptions satisfies { port: number } | null | undefined;
// @ts-expect-error Values behind an optional key may be undefined.
strapi.config.get('plugin::config-lab-nested.provider.options.port') satisfies number;
// Numeric segments index arrays and tuples. Array elements may be absent.
const arrayElementPort = strapi.config.get('plugin::config-lab-nested.items.0.port');
arrayElementPort satisfies number | undefined;
const pluginArrayElement = strapi.plugin('config-lab-nested').config('items.1');
pluginArrayElement satisfies { port: number } | undefined;
const tupleElementHost = strapi.config.get('plugin::config-lab-nested.pair.1.host');
tupleElementHost satisfies string;
// @ts-expect-error Array elements may be absent.
strapi.config.get('plugin::config-lab-nested.items.0.port') satisfies number;
// @ts-expect-error Non-numeric segments into an array are outside the contract.
strapi.config.get('plugin::config-lab-nested.items.first').anything satisfies unknown;
// A defined default replaces undefined, including through optional parents and array indices.
const optionalPortWithDefault = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  1337
);
optionalPortWithDefault satisfies number;
const pluginOptionalPortWithDefault = strapi
  .plugin('config-lab-nested')
  .config('provider.options.port', 1337);
pluginOptionalPortWithDefault satisfies number;
const arrayPortWithDefault = strapi.config.get('plugin::config-lab-nested.items.0.port', 1337);
const pluginArrayWithDefault = strapi.plugin('config-lab-nested').config('items.0', { port: 1337 });
const undefinedDefault = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  undefined
);
const pluginUndefinedDefault = strapi
  .plugin('config-lab-nested')
  .config('provider.options.port', undefined);
declare const maybePort: number | undefined;
const optionalDefault = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  maybePort
);
const pluginOptionalDefault = strapi
  .plugin('config-lab-nested')
  .config('provider.options.port', maybePort);
const nullableDefault = strapi.config.get('plugin::config-lab-nested.nullable', 1337);
const pluginNullableDefault = strapi.plugin('config-lab-nested').config('nullable', 1337);
const nullDefault = strapi.config.get('plugin::config-lab-nested.nullable', null);
const pluginNullDefault = strapi.plugin('config-lab-nested').config('nullable', null);
// Defaults remove only undefined; they do not narrow a registered number to a literal or erase null.
type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
declare const defaultChecks: [
  Expect<Equal<typeof optionalPortWithDefault, number>>,
  Expect<Equal<typeof pluginOptionalPortWithDefault, number>>,
  Expect<Equal<typeof arrayPortWithDefault, number>>,
  Expect<typeof pluginArrayWithDefault extends { port: number } ? true : false>,
  Expect<{ port: number } extends typeof pluginArrayWithDefault ? true : false>,
  Expect<Equal<typeof nestedOptionalPort, number | undefined>>,
  Expect<typeof pluginNestedOptions extends { port: number } | null | undefined ? true : false>,
  Expect<{ port: number } | null | undefined extends typeof pluginNestedOptions ? true : false>,
  Expect<Equal<typeof undefinedDefault, number | undefined>>,
  Expect<Equal<typeof pluginUndefinedDefault, number | undefined>>,
  Expect<Equal<typeof optionalDefault, number | undefined>>,
  Expect<Equal<typeof pluginOptionalDefault, number | undefined>>,
  Expect<Equal<typeof nullableDefault, number | null>>,
  Expect<Equal<typeof pluginNullableDefault, number | null>>,
  Expect<Equal<typeof nullDefault, number | null>>,
  Expect<Equal<typeof pluginNullDefault, number | null>>,
];
defaultChecks satisfies unknown;

// A spread default may omit its argument entirely, even if its supplied value is always defined.
declare const conditionalDefaults: [] | [number];
declare const optionalDefaults: [number?];
const conditionalPort = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  ...conditionalDefaults
);
const pluginConditionalPort = strapi
  .plugin('config-lab-nested')
  .config('provider.options.port', ...conditionalDefaults);
const optionalSpreadPort = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  ...optionalDefaults
);
const pluginOptionalSpreadPort = strapi
  .plugin('config-lab-nested')
  .config('provider.options.port', ...optionalDefaults);
const explicitTuplePort = strapi.config.get<
  unknown,
  'plugin::config-lab-nested.provider.options.port',
  [] | [number]
>('plugin::config-lab-nested.provider.options.port');
const pluginExplicitTuplePort = strapi
  .plugin('config-lab-nested')
  .config<unknown, 'provider.options.port', [] | [number]>('provider.options.port');
declare const tupleChecks: [
  Expect<Equal<typeof conditionalPort, number | undefined>>,
  Expect<Equal<typeof pluginConditionalPort, number | undefined>>,
  Expect<Equal<typeof optionalSpreadPort, number | undefined>>,
  Expect<Equal<typeof pluginOptionalSpreadPort, number | undefined>>,
  Expect<Equal<typeof explicitTuplePort, number | undefined>>,
  Expect<Equal<typeof pluginExplicitTuplePort, number | undefined>>,
];
tupleChecks satisfies unknown;
// @ts-expect-error Explicit tuple types cannot promise a default without supplying it.
strapi.config.get<unknown, 'plugin::config-lab-nested.nullable', [number]>(
  'plugin::config-lab-nested.nullable'
);
// @ts-expect-error Plugin explicit tuples must supply the promised default too.
strapi.plugin('config-lab-nested').config<unknown, 'nullable', [number]>('nullable');
// @ts-expect-error A supplied default does not replace null.
nullableDefault satisfies number;
// @ts-expect-error A default that may be undefined cannot guarantee a defined result.
pluginOptionalDefault satisfies number;
// @ts-expect-error Defined defaults still have to match the registered optional value.
strapi.plugin('config-lab-nested').config('provider.options.port', '1337');
// @ts-expect-error Dotted default values must match the registered value type.
strapi.config.get('plugin::config-lab.limit', 'ten');
// @ts-expect-error Paths outside the contract resolve to unknown.
strapi.config.get('plugin::config-lab.missing').anything satisfies unknown;
// @ts-expect-error Plugin-scoped paths outside the contract resolve to unknown.
strapi.plugin('config-lab-nested').config('provider.missing').anything satisfies unknown;

// An override replaces the default contract rather than intersecting it.
// @ts-expect-error Keys from the replaced default are not retained.
strapi.config.get('plugin::config-lab').defaultOnly satisfies unknown;
// Explicit generics, unregistered namespaces, array paths and dynamic lookups keep the permissive signature.
const unregisteredNamespace = strapi.config.get('plugin::unregistered');
unregisteredNamespace satisfies unknown;
strapi.config.get<number>('server.port') satisfies number;
strapi.config.get<number>('plugin::config-lab.limit') satisfies number;
strapi.config.get<number>(dynamicKey) satisfies number;
strapi.config.get<number>(['plugin::config-lab', 'limit']) satisfies number;
strapi.plugin('unregistered').config<number>('limit') satisfies number;
strapi.plugin('config-lab').config<string>('unregistered') satisfies string;
strapi.plugin(dynamicPlugin).config<number>('limit') satisfies number;
strapi.plugin('config-lab').config<number>(dynamicKey) satisfies number;
const requiredUndefinedDefault = strapi.config.get('plugin::config-lab.limit', undefined);
const pluginRequiredUndefinedDefault = strapi.plugin('config-lab').config('limit', undefined);
requiredUndefinedDefault satisfies number;
pluginRequiredUndefinedDefault satisfies number;
strapi.config.get<number>('server.port', undefined) satisfies number;
strapi.plugin('config-lab').config<number>('limit', undefined) satisfies number;
const explicitDefault = strapi.config.get<number>('plugin::config-lab.limit', 1337);
const explicitPluginDefault = strapi.plugin('config-lab').config<number>('limit', 1337);
const explicitOptional = strapi.config.get<number | undefined>('server.port', 1337);
const explicitPluginOptional = strapi
  .plugin('config-lab')
  .config<number | undefined>('limit', 1337);
declare const explicitChecks: [
  Expect<Equal<typeof explicitDefault, number>>,
  Expect<Equal<typeof explicitPluginDefault, number>>,
  Expect<Equal<typeof explicitOptional, number | undefined>>,
  Expect<Equal<typeof explicitPluginOptional, number | undefined>>,
];
explicitChecks satisfies unknown;
// @ts-expect-error Explicit result types continue to constrain defaults.
strapi.config.get<number>('server.port', '1337');
// @ts-expect-error Explicit plugin result types continue to constrain defaults.
strapi.plugin('config-lab').config<number>('limit', '1337');
const legacyPlugin: Plugin = strapi.plugin('config-lab');
legacyPlugin.config<number>('limit') satisfies number;
const contextual: { port: number } = strapi.config.get('server');
const unregisteredPathWithDefault = strapi.config.get('server.port', 1337);
unregisteredPathWithDefault satisfies number;
const dynamicDefault = strapi.config.get(dynamicKey, 1337);
const pluginDynamicDefault = strapi.plugin(dynamicPlugin).config(dynamicKey, 1337);
const unknownPathDefault = strapi.config.get('plugin::config-lab.unknown', 1337);
const pluginUnknownPathDefault = strapi.plugin('config-lab').config('unknown', 1337);
dynamicDefault satisfies number;
pluginDynamicDefault satisfies number;
unknownPathDefault satisfies number;
pluginUnknownPathDefault satisfies number;

// Generic helpers that forward a config path keep inferring from their declared return type.
const getLabConfig = <TKey extends keyof LabConfig>(key: TKey): LabConfig[TKey] =>
  strapi.plugin('unregistered').config(key);
getLabConfig('limit') satisfies number;

// Implementations and mocks written against the permissive signature still type check.
const provider: ConfigProvider = {
  get: () => ({}) as any,
  set() {
    return this;
  },
  has: () => true,
};
provider.get('plugin::config-lab').limit satisfies number;
// @ts-expect-error Assigned functions are checked against the generic signature, as before registries.
provider.get = () => ({ limit: 1 });
contextual.port satisfies number;
// The global `strapi` instance resolves through the same registries.
const globalEnabled = globalThis.strapi.config.get('plugin::config-lab').enabled;
globalEnabled satisfies boolean;
