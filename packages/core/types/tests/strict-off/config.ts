import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

declare const strapi: Core.Strapi;

const explicitConfig = strapi.config.get<number>('plugin::legacy.enabled');
const explicitPluginConfig = strapi.plugin('legacy').config<number>('enabled');
const defaultConfig = strapi.config.get('plugin::legacy.enabled', 123);
const defaultPluginConfig = strapi.plugin('legacy').config('enabled', 123);
explicitConfig satisfies number;
explicitPluginConfig satisfies number;
defaultConfig satisfies number;
defaultPluginConfig satisfies number;

// Config defaults preserve legacy contextual inference and explicit result generics.
const contextualConfig: { port: number } = strapi.config.get('plugin::legacy');
const contextualPluginConfig: { port: number } = strapi.plugin('legacy').config('enabled');
contextualConfig.port satisfies number;
contextualPluginConfig.port satisfies number;
const explicitDefaultConfig = strapi.config.get<number>('plugin::legacy.enabled', 123);
const explicitDefaultPluginConfig = strapi.plugin('legacy').config<number>('enabled', 123);
const explicitUndefinedConfig = strapi.config.get<number>('plugin::legacy.enabled', undefined);
const explicitUndefinedPluginConfig = strapi.plugin('legacy').config<number>('enabled', undefined);
const nullableConfig = strapi.config.get<number | null>('plugin::legacy.enabled', null);
declare const configDefaultChecks: [
  Expect<Equal<typeof explicitDefaultConfig, number>>,
  Expect<Equal<typeof explicitDefaultPluginConfig, number>>,
  Expect<Equal<typeof explicitUndefinedConfig, number>>,
  Expect<Equal<typeof explicitUndefinedPluginConfig, number>>,
  Expect<Equal<typeof nullableConfig, number | null>>,
];
configDefaultChecks satisfies unknown;
const fallbackBoolean = strapi.config.get('plugin::legacy.enabled', false);
const fallbackString = strapi.config.get('unregistered.label', 'fallback');
const fallbackNumber = strapi.config.get('unregistered.limit', 42);
const pluginFallbackBoolean = strapi.plugin('legacy').config('enabled', false);
const pluginFallbackString = strapi.plugin('legacy').config('label', 'fallback');
const pluginFallbackNumber = strapi.plugin('legacy').config('limit', 42);
const fallbackObject = strapi.config.get('unregistered.options', { enabled: false });
const pluginFallbackArray = strapi.plugin('legacy').config('labels', ['first']);
fallbackObject.enabled = true;
pluginFallbackArray.push('second');
declare const fallbackChecks: [
  Expect<Equal<typeof fallbackBoolean, false>>,
  Expect<Equal<typeof fallbackString, 'fallback'>>,
  Expect<Equal<typeof fallbackNumber, 42>>,
  Expect<Equal<typeof pluginFallbackBoolean, false>>,
  Expect<Equal<typeof pluginFallbackString, 'fallback'>>,
  Expect<Equal<typeof pluginFallbackNumber, 42>>,
  Expect<Equal<typeof fallbackObject, { enabled: boolean }>>,
  Expect<Equal<typeof pluginFallbackArray, string[]>>,
];
fallbackChecks satisfies unknown;
// Defaults infer widening literals, as before registries, so mutable use sites keep compiling.
let reassignedPort = strapi.config.get('plugin::legacy.port', 1337);
reassignedPort = 4000;
let reassignedPluginPort = strapi.plugin('legacy').config('port', 1337);
reassignedPluginPort = 4000;
let reassignedEnabled = strapi.config.get('plugin::legacy.enabled', false);
reassignedEnabled = true;
const mutableOptions = { port: strapi.config.get('unregistered.port', 1337) };
mutableOptions.port = 4000;
const mutableLabels = [strapi.config.get('plugin::legacy.label', 'first')];
mutableLabels.push('second');
[reassignedPort, reassignedPluginPort, reassignedEnabled] satisfies unknown;
const forwardDefault = <T>(key: string, value: T): T => strapi.config.get<T>(key, value);
const forwardPluginDefault = <T>(key: string, value: T): T =>
  strapi.plugin('legacy').config<T>(key, value);
forwardDefault<void>('unregistered', undefined) satisfies void;
forwardPluginDefault<unknown>('unregistered', undefined) satisfies unknown;
// @ts-expect-error Explicit result types still constrain defaults with registries disabled.
strapi.config.get<number>('plugin::legacy.enabled', '123');
// @ts-expect-error Explicit plugin result types still constrain defaults with registries disabled.
strapi.plugin('legacy').config<number>('enabled', '123');

// Without strict types, the global middlewares config accepts handlers as on develop.
const middlewaresConfig: Core.Config.Middlewares = [
  'strapi::logger',
  { name: 'strapi::cors', config: {} },
  async (_ctx, next) => next(),
];
middlewaresConfig satisfies unknown;

// Without strict types, preview handler params keep develop's `string` status.
type PreviewStatusChecks = [
  Expect<
    Equal<
      Parameters<NonNullable<Core.Config.Admin['preview']>['config']['handler']>[1]['status'],
      string | undefined
    >
  >,
];
declare const previewStatusChecks: PreviewStatusChecks;
previewStatusChecks satisfies unknown;
