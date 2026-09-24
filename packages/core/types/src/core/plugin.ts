import type { PropertyPath } from 'lodash';
import type { Controller, ControllerFor } from './controller';
import type { Module } from './module';
import type { Route } from './route';
import type { Router } from './router';
import type { Service, ServiceFor } from './service';
import type { ConfigFor, ConfigNamespace, ConfigPathValue } from './strapi';
import type { SuggestedString } from '../utils/string';
import type { IsStrict } from './strictness';

/** Names of the plugin's entries in a registry keyed by full UID (`plugin::<plugin>.<name>`). */
type PluginEntryNames<TUID, TPlugin extends string> = string extends TPlugin
  ? never
  : TUID extends `plugin::${TPlugin}.${infer TName}`
    ? TName
    : never;

type ServiceNames<TPlugin extends string> = PluginEntryNames<
  keyof Strapi.Registries.AppServices | keyof Strapi.Registries.PackageServices,
  TPlugin
>;

type ControllerNames<TPlugin extends string> = PluginEntryNames<
  keyof Strapi.Registries.AppControllers | keyof Strapi.Registries.PackageControllers,
  TPlugin
>;

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

/** The registered value when `TKey` is a key or dotted path of the plugin's config contract, `T` otherwise. */
type PluginConfigLookup<TPlugin extends string, TKey, T> = IsStrict extends false
  ? T
  : [PluginConfigNamespace<TPlugin>] extends [never]
    ? T
    : PluginConfigPath<TPlugin> extends TKey
      ? T
      : TKey extends string
        ? ConfigPathValue<PluginConfigNamespace<TPlugin>, TKey, T>
        : T;

/** The registered contract when `TServiceName` is a registered service of the plugin, `T` otherwise. */
type PluginServiceLookup<TPlugin extends string, TServiceName, T> = IsStrict extends false
  ? T
  : [ServiceNames<TPlugin>] extends [never]
    ? T
    : SuggestedString<ServiceNames<TPlugin>> extends TServiceName
      ? T
      : TServiceName extends ServiceNames<TPlugin>
        ? ServiceFor<`plugin::${TPlugin}.${TServiceName}`>
        : T;

/** The registered contract when `TControllerName` is a registered controller of the plugin, `T` otherwise. */
type PluginControllerLookup<TPlugin extends string, TControllerName, T> = IsStrict extends false
  ? T
  : [ControllerNames<TPlugin>] extends [never]
    ? T
    : SuggestedString<ControllerNames<TPlugin>> extends TControllerName
      ? T
      : TControllerName extends ControllerNames<TPlugin>
        ? ControllerFor<`plugin::${TPlugin}.${TControllerName}`>
        : T;

export type Plugin<TName extends string = string> = Omit<
  Module,
  'routes' | 'service' | 'config' | 'controller'
> & {
  routes: Route[] | Record<string, Router>;
  /**
   * Reads a key or dotted path of the plugin config. A registered contract resolves the value type.
   *
   * A default value does not remove `undefined` from a registered result, although it replaces an
   * `undefined` value at runtime.
   */
  config<T = unknown, TKey extends PluginConfigPath<TName> = PluginConfigPath<TName>>(
    key: TKey,
    defaultVal?: PluginConfigLookup<TName, TKey, T>
  ): PluginConfigLookup<TName, TKey, T>;
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
