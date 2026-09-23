import type { Core } from '../..';

type LabConfig = {
  enabled: boolean;
  limit: number;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultConfigs {
        'plugin::config-lab': { enabled: string; defaultOnly: true };
        'plugin::config-lab-default': LabConfig;
        'plugin::config-lab-nested': {
          provider: { name: string; options?: { port: number } | null };
        };
      }

      interface Configs {
        'plugin::config-lab': LabConfig;
      }
    }
  }
}

declare const strapi: Core.Strapi;
declare const dynamicPlugin: string;
declare const dynamicKey: string;

// Full namespace lookups resolve the registered contract.
strapi.config.get('plugin::config-lab') satisfies LabConfig;
strapi.config.get('plugin::config-lab').limit satisfies number;
strapi.config.get('plugin::config-lab-default').enabled satisfies boolean;
strapi.config.get('plugin::config-lab', { enabled: true, limit: 1 }) satisfies LabConfig;
// @ts-expect-error Registered contracts reject nonexistent keys.
strapi.config.get('plugin::config-lab').missing satisfies unknown;
// @ts-expect-error Default values must match the registered contract.
strapi.config.get('plugin::config-lab', { enabled: 'yes', limit: 1 });

// Plugin-scoped lookups resolve a key of the registered contract.
strapi.plugin('config-lab').config('limit') satisfies number;
strapi.plugin('config-lab-default').config('enabled') satisfies boolean;
strapi.plugin('config-lab').config('limit', 10) satisfies number;
// @ts-expect-error Plugin-scoped lookups preserve the registered value type.
strapi.plugin('config-lab').config('limit') satisfies string;
// @ts-expect-error Plugin-scoped default values must match the registered value type.
strapi.plugin('config-lab').config('limit', 'ten');

// Dotted paths resolve inside the registered contract, like lodash `get`.
strapi.config.get('plugin::config-lab.limit') satisfies number;
strapi.config.get('plugin::config-lab-nested.provider.name') satisfies string;
strapi.config.get('plugin::config-lab-nested.provider.options.port') satisfies number | undefined;
strapi.plugin('config-lab-nested').config('provider.name') satisfies string;
strapi.plugin('config-lab-nested').config('provider.options') satisfies
  | { port: number }
  | null
  | undefined;
// @ts-expect-error Values behind an optional key may be undefined.
strapi.config.get('plugin::config-lab-nested.provider.options.port') satisfies number;
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
strapi.config.get('plugin::unregistered') satisfies unknown;
strapi.config.get<number>('server.port') satisfies number;
strapi.config.get<number>('plugin::config-lab.limit') satisfies number;
strapi.config.get<number>(dynamicKey) satisfies number;
strapi.config.get<number>(['plugin::config-lab', 'limit']) satisfies number;
strapi.plugin('unregistered').config<number>('limit') satisfies number;
strapi.plugin('config-lab').config<string>('unregistered') satisfies string;
strapi.plugin(dynamicPlugin).config<number>('limit') satisfies number;
strapi.plugin('config-lab').config<number>(dynamicKey) satisfies number;
const legacyPlugin: Core.Plugin = strapi.plugin('config-lab');
legacyPlugin.config<number>('limit') satisfies number;
const contextual: { port: number } = strapi.config.get('server');
strapi.config.get('server.port', 1337) satisfies number;

// Generic helpers that forward a config path keep inferring from their declared return type.
const getLabConfig = <TKey extends keyof LabConfig>(key: TKey): LabConfig[TKey] =>
  strapi.plugin('unregistered').config(key);
getLabConfig('limit') satisfies number;

// Implementations and mocks written against the permissive signature still type check.
const provider: Core.ConfigProvider = {
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
globalThis.strapi.config.get('plugin::config-lab').enabled satisfies boolean;
