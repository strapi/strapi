import type { PropertyPath } from 'lodash';
import type { Controller, ControllerFor, RegisteredControllerUID } from './controller';
import type { Module } from './module';
import type { Route } from './route';
import type { Router } from './router';
import type { RegisteredPolicyName } from './policy';
import type { RegisteredServiceUID, Service, ServiceFor } from './service';
import type {
  ConfigDefaultValue,
  ConfigFor,
  ConfigNamespace,
  ConfigPathLookup,
  ConfigPathSuggestion,
} from './strapi';
import type { SuggestedString } from '../utils/string';
import type { IsDynamicName, IsStrict, RegisteredRecord } from './strictness';

/** Names of the plugin's entries in a registry keyed by full UID (`plugin::<plugin>.<name>`). */
type PluginEntryNames<TUID, TPlugin extends string> = string extends TPlugin
  ? never
  : TUID extends `plugin::${TPlugin}.${infer TName}`
    ? TName
    : never;

type ServiceNames<TPlugin extends string> = PluginEntryNames<RegisteredServiceUID, TPlugin>;

type ControllerNames<TPlugin extends string> = PluginEntryNames<RegisteredControllerUID, TPlugin>;

type PluginConfigNamespace<TPlugin extends string> = string extends TPlugin
  ? never
  : Extract<`plugin::${TPlugin}`, ConfigNamespace>;

/** Top-level keys of the plugin's registered config contract, listed for completion. */
type PluginConfigKey<TPlugin extends string> = [PluginConfigNamespace<TPlugin>] extends [never]
  ? never
  : keyof ConfigFor<PluginConfigNamespace<TPlugin>> & string;

/** Any plugin config key. Top-level keys of the registered contract are listed for completion. */
type PluginConfigPath<TPlugin extends string> =
  | SuggestedString<PluginConfigKey<TPlugin>>
  | Exclude<PropertyPath, string>;

/** Completion candidates for a partially typed dotted path of the plugin's config contract, e.g. `'init.debug'`. */
type PluginConfigPathSuggestion<TPlugin extends string, TKey> = [
  PluginConfigNamespace<TPlugin>,
] extends [never]
  ? never
  : ConfigPathSuggestion<ConfigFor<PluginConfigNamespace<TPlugin>>, TKey>;

/** The registered value when `TKey` is a key or dotted path of the plugin's config contract, `T` otherwise. */
type PluginConfigLookup<
  TPlugin extends string,
  TKey,
  T,
  TDefault = undefined,
> = IsStrict extends false
  ? T
  : [PluginConfigNamespace<TPlugin>] extends [never]
    ? T
    : PluginConfigPath<TPlugin> extends TKey
      ? T
      : TKey extends string
        ? ConfigPathLookup<PluginConfigNamespace<TPlugin>, TKey, T, TDefault>
        : T;

/**
 * `never` when `plugin::<plugin>.<name>` is a literal UID, `T` when the plugin or the name is dynamic.
 * The registries cannot validate dynamic names.
 */
type UnregisteredPluginEntry<TPlugin extends string, TName, T> = TName extends string
  ? IsDynamicName<`plugin::${TPlugin}.${TName}`> extends true
    ? // TODO @Nico decide whether dynamic names should also close in strict mode
      T
    : never
  : T;

/**
 * The registered contract when `TServiceName` is a registered service of the plugin.
 * With strict types enabled, an unregistered literal name resolves to `never`. An explicit generic
 * (`service<MyService>('name')`) or a dynamic name resolves to `T`.
 */
type PluginServiceLookup<TPlugin extends string, TServiceName, T> = IsStrict extends false
  ? T
  : SuggestedString<ServiceNames<TPlugin>> extends TServiceName
    ? T
    : [ServiceNames<TPlugin>] extends [never]
      ? UnregisteredPluginEntry<TPlugin, TServiceName, T>
      : TServiceName extends ServiceNames<TPlugin>
        ? ServiceFor<`plugin::${TPlugin}.${TServiceName}`>
        : UnregisteredPluginEntry<TPlugin, TServiceName, T>;

/**
 * The registered contract when `TControllerName` is a registered controller of the plugin.
 * With strict types enabled, an unregistered literal name resolves to `never`. An explicit generic
 * (`controller<MyController>('name')`) or a dynamic name resolves to `T`.
 */
type PluginControllerLookup<TPlugin extends string, TControllerName, T> = IsStrict extends false
  ? T
  : SuggestedString<ControllerNames<TPlugin>> extends TControllerName
    ? T
    : [ControllerNames<TPlugin>] extends [never]
      ? UnregisteredPluginEntry<TPlugin, TControllerName, T>
      : TControllerName extends ControllerNames<TPlugin>
        ? ControllerFor<`plugin::${TPlugin}.${TControllerName}`>
        : UnregisteredPluginEntry<TPlugin, TControllerName, T>;

export type Plugin<TName extends string = string> = Omit<
  Module<`plugin::${TName}`>,
  'routes' | 'service' | 'config' | 'controller'
> & {
  routes: Route[] | Record<string, Router>;
  /**
   * Reads a key or dotted path of the plugin config. A registered contract resolves the value type.
   * Editors list its top-level keys, then the keys under the path being typed.
   *
   * A defined default replaces `undefined` in the result; `null` values are preserved.
   */
  config<
    T = unknown,
    TKey extends PluginConfigPath<TName> = PluginConfigPath<TName>,
    TArgs extends [] | [ConfigDefaultValue] = [] | [PluginConfigLookup<TName, TKey, T> | undefined],
  >(
    key: TKey | PluginConfigPathSuggestion<TName, TKey>,
    ...args: TArgs & ([] | [defaultVal: PluginConfigLookup<TName, TKey, T> | undefined])
  ): PluginConfigLookup<TName, TKey, T, NoInfer<TArgs[0]>>;
  service<
    T extends Service = Service,
    TServiceName extends SuggestedString<ServiceNames<TName>> = SuggestedString<
      ServiceNames<TName>
    >,
  >(
    name: TServiceName
  ): PluginServiceLookup<TName, TServiceName, T>;
  controller<
    T extends Controller = Controller,
    TControllerName extends SuggestedString<ControllerNames<TName>> = SuggestedString<
      ControllerNames<TName>
    >,
  >(
    name: TControllerName
  ): PluginControllerLookup<TName, TControllerName, T>;
  [key: string]: any;
};

/** The plugin name of a `plugin::<plugin>.<name>` UID or a `plugin::<plugin>` config namespace. */
type PluginNameOf<TUID> = TUID extends `plugin::${infer TPlugin}.${string}`
  ? TPlugin
  : TUID extends `plugin::${infer TPlugin}`
    ? TPlugin
    : never;

/** Plugins with at least one registered service, controller, policy or config contract. */
export type RegisteredPluginName = PluginNameOf<
  RegisteredServiceUID | RegisteredControllerUID | RegisteredPolicyName | ConfigNamespace
>;

/**
 * Plugins keyed by name, e.g. `strapi.plugins`. With strict types enabled, a registered plugin resolves
 * to `Plugin<name>`, like `strapi.plugin(name)`; other names, literal or dynamic, resolve to `Plugin`.
 */
export type PluginMap = IsStrict extends false
  ? Record<string, Plugin>
  : RegisteredRecord<{ [TPlugin in RegisteredPluginName]: Plugin<TPlugin> }, Plugin>;
