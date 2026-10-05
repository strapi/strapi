import type { PropertyPath } from 'lodash';
import type { ControllerFor, RegisteredControllerUID } from './controller';
import type {
  MiddlewareConfigFor,
  MiddlewareFactory,
  RegisteredMiddlewareName,
} from './middleware';
import type { Module } from './module';
import type { Route } from './route';
import type { Router } from './router';
import type { Policy, PolicyConfigFor, RegisteredPolicyName } from './policy';
import type { RegisteredServiceUID, ServiceFor } from './service';
import type {
  ConfigDefaultValue,
  ConfigFor,
  ConfigNamespace,
  ConfigPathLookup,
  ConfigPathSuggestion,
} from './strapi';
import type { SuggestedString } from '../utils/string';
import type { IsStrict, RegisteredRecord } from './strictness';

/** Names of the plugin's entries in a registry keyed by full UID (`plugin::<plugin>.<name>`). */
type PluginEntryNames<TUID, TPlugin extends string> = string extends TPlugin
  ? never
  : TUID extends `plugin::${TPlugin}.${infer TName}`
    ? TName
    : never;

type ServiceNames<TPlugin extends string> = PluginEntryNames<RegisteredServiceUID, TPlugin>;

type ControllerNames<TPlugin extends string> = PluginEntryNames<RegisteredControllerUID, TPlugin>;

type PolicyNames<TPlugin extends string> = PluginEntryNames<RegisteredPolicyName, TPlugin>;

type MiddlewareNames<TPlugin extends string> = PluginEntryNames<RegisteredMiddlewareName, TPlugin>;

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
type PluginConfigLookup<TPlugin extends string, TKey, T, TDefault = undefined> = [
  PluginConfigNamespace<TPlugin>,
] extends [never]
  ? T
  : PluginConfigPath<TPlugin> extends TKey
    ? T
    : TKey extends string
      ? ConfigPathLookup<PluginConfigNamespace<TPlugin>, TKey, T, TDefault>
      : T;

/**
 * The registered contract when `TServiceName` is a registered service of the plugin, `T` otherwise.
 * `T` is an explicit generic (`service<MyService>('name')`), or `unknown` by default.
 */
type PluginServiceLookup<TPlugin extends string, TServiceName, T> =
  SuggestedString<ServiceNames<TPlugin>> extends TServiceName
    ? T
    : TServiceName extends ServiceNames<TPlugin>
      ? ServiceFor<`plugin::${TPlugin}.${TServiceName}`>
      : T;

/**
 * The registered contract when `TControllerName` is a registered controller of the plugin, `T` otherwise.
 * `T` is an explicit generic (`controller<MyController>('name')`), or `unknown` by default.
 */
type PluginControllerLookup<TPlugin extends string, TControllerName, T> =
  SuggestedString<ControllerNames<TPlugin>> extends TControllerName
    ? T
    : TControllerName extends ControllerNames<TPlugin>
      ? ControllerFor<`plugin::${TPlugin}.${TControllerName}`>
      : T;

/**
 * The registered policy when `TPolicyName` is a registered policy of the plugin, `T` otherwise.
 * `T` is an explicit generic (`policy<MyPolicy>('name')`), or `unknown` by default.
 */
type PluginPolicyLookup<TPlugin extends string, TPolicyName, T> =
  SuggestedString<PolicyNames<TPlugin>> extends TPolicyName
    ? T
    : TPolicyName extends PolicyNames<TPlugin>
      ? Policy<PolicyConfigFor<Extract<`plugin::${TPlugin}.${TPolicyName}`, RegisteredPolicyName>>>
      : T;

/**
 * The registered middleware when `TMiddlewareName` is a registered middleware of the plugin, `T`
 * otherwise. `T` is an explicit generic (`middleware<MyFactory>('name')`), or `unknown` by default.
 */
type PluginMiddlewareLookup<TPlugin extends string, TMiddlewareName, T> =
  SuggestedString<MiddlewareNames<TPlugin>> extends TMiddlewareName
    ? T
    : TMiddlewareName extends MiddlewareNames<TPlugin>
      ? MiddlewareFactory<
          MiddlewareConfigFor<
            Extract<`plugin::${TPlugin}.${TMiddlewareName}`, RegisteredMiddlewareName>
          >
        >
      : T;

/**
 * Any key when the plugin has no registered config contract, `never` otherwise.
 * TODO @Nico An unknown key of a registered plugin keeps a non-widening literal default. Rare, accepted.
 */
type LegacyPluginConfigPath<TName extends string> = [PluginConfigNamespace<TName>] extends [never]
  ? PropertyPath
  : never;

/**
 * The plugin's `policy` lookup with strict mode. Without it, `policy` keeps the `any` of the plugin
 * index signature, as on develop.
 */
type StrictPluginPolicyGetter<TName extends string> = {
  /**
   * Resolves the registered policy of the relative name `name`, i.e. `plugin::<plugin>.<name>` as at
   * runtime, which receives its config contract. An explicit type argument (`policy<MyPolicy>(name)`)
   * wins over the registries. Registered names are listed for completion.
   */
  policy<
    T = unknown,
    TPolicyName extends SuggestedString<PolicyNames<TName>> = SuggestedString<PolicyNames<TName>>,
  >(
    name: TPolicyName
  ): PluginPolicyLookup<TName, TPolicyName, NoInfer<T>>;
};

/**
 * The plugin's `middleware` lookup with strict mode. Without it, `middleware` keeps the `any` of the
 * plugin index signature, as on develop.
 */
type StrictPluginMiddlewareGetter<TName extends string> = {
  /**
   * Resolves the registered middleware of the relative name `name`, i.e. `plugin::<plugin>.<name>` as
   * at runtime, a factory that receives its config contract. An explicit type argument
   * (`middleware<MyFactory>(name)`) wins over the registries. Registered names are listed for
   * completion.
   */
  middleware<
    T = unknown,
    TMiddlewareName extends SuggestedString<MiddlewareNames<TName>> = SuggestedString<
      MiddlewareNames<TName>
    >,
  >(
    name: TMiddlewareName
  ): PluginMiddlewareLookup<TName, TMiddlewareName, NoInfer<T>>;
};

type StrictPluginConfigGetter<TName extends string> = {
  /** Reads the config of a plugin without a registered contract, as without strict mode. */
  config<T = unknown>(key: LegacyPluginConfigPath<TName>, defaultVal?: T): T;
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
};

/**
 * The `Module` members of a plugin. With strict types enabled, the lookups and `config` are the
 * plugin's own.
 */
type PluginModule<TName extends string> = IsStrict extends false
  ? Omit<Module, 'routes'>
  : Omit<
      Module<`plugin::${TName}`>,
      'routes' | 'service' | 'config' | 'controller' | 'policy' | 'middleware'
    >;

/**
 * The plugin's own members. With strict types enabled, registered names of the plugin resolve to
 * their contracts. Without them, members outside `Module`, such as `policy` and `middleware`, are
 * `any`, as on develop.
 */
type PluginMembers<TName extends string> = IsStrict extends false
  ? {
      routes: Route[] | Record<string, Router>;
      [key: string]: any;
    }
  : {
      routes: Route[] | Record<string, Router>;
      service<
        T = unknown,
        TServiceName extends SuggestedString<ServiceNames<TName>> = SuggestedString<
          ServiceNames<TName>
        >,
      >(
        name: TServiceName
      ): PluginServiceLookup<TName, TServiceName, NoInfer<T>>;
      controller<
        T = unknown,
        TControllerName extends SuggestedString<ControllerNames<TName>> = SuggestedString<
          ControllerNames<TName>
        >,
      >(
        name: TControllerName
      ): PluginControllerLookup<TName, TControllerName, NoInfer<T>>;
      [key: string]: any;
    } & StrictPluginConfigGetter<TName> &
      StrictPluginPolicyGetter<TName> &
      StrictPluginMiddlewareGetter<TName>;

/**
 * A loaded plugin. With strict types enabled, a literal `TName` types its lookups and maps from the
 * registries. Without them, every plugin keeps develop's type, so mocks and `@ts-expect-error` lines
 * written for develop keep compiling, and `config` defaults infer widening literals, e.g.
 * `let limit = config('limit', 10)` is a `number`.
 */
export type Plugin<TName extends string = string> = PluginModule<TName> & PluginMembers<TName>;

/** The plugin name of a `plugin::<plugin>.<name>` UID or a `plugin::<plugin>` config namespace. */
type PluginNameOf<TUID> = TUID extends `plugin::${infer TPlugin}.${string}`
  ? TPlugin
  : TUID extends `plugin::${infer TPlugin}`
    ? TPlugin
    : never;

/** Plugins with at least one registered service, controller, policy, middleware or config contract. */
export type RegisteredPluginName = PluginNameOf<
  | RegisteredServiceUID
  | RegisteredControllerUID
  | RegisteredPolicyName
  | RegisteredMiddlewareName
  | ConfigNamespace
>;

/**
 * Plugins keyed by name, e.g. `strapi.plugins`. With strict types enabled, a registered plugin resolves
 * to `Plugin<name>`, like `strapi.plugin(name)`; other names, literal or dynamic, resolve to `Plugin`.
 */
export type PluginMap = IsStrict extends false
  ? Record<string, Plugin>
  : RegisteredRecord<{ [TPlugin in RegisteredPluginName]: Plugin<TPlugin> }, Plugin>;
