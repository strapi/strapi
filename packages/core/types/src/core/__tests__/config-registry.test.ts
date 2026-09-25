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
// A default value does not remove `undefined` from the result, although the runtime returns the default.
const optionalPortWithDefault = strapi.config.get(
  'plugin::config-lab-nested.provider.options.port',
  1337
);
optionalPortWithDefault satisfies number | undefined;
// @ts-expect-error Known limitation: the result keeps `undefined`.
optionalPortWithDefault satisfies number;
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
const legacyPlugin: Plugin = strapi.plugin('config-lab');
legacyPlugin.config<number>('limit') satisfies number;
const contextual: { port: number } = strapi.config.get('server');
const unregisteredPathWithDefault = strapi.config.get('server.port', 1337);
unregisteredPathWithDefault satisfies number;

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
