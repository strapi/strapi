import type { PropertyPath } from 'lodash';
import type { Module } from './module';
import type { Route } from './route';
import type { Router } from './router';
import type { Service, ServiceFor } from './service';
import type { ConfigFor, ConfigNamespace, ConfigPathValue } from './strapi';
import type { SuggestedString } from '../utils/string';

type ServiceNames<TPlugin extends string> = string extends TPlugin
  ? never
  : keyof {
      [TUID in
        | keyof Strapi.Registries.Services
        | keyof Strapi.Registries.DefaultServices as TUID extends `plugin::${TPlugin}.${infer TService}`
        ? TService
        : never]: ServiceFor<TUID>;
    };

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
type PluginConfigLookup<TPlugin extends string, TKey, T> = [
  PluginConfigNamespace<TPlugin>,
] extends [never]
  ? T
  : PluginConfigPath<TPlugin> extends TKey
    ? T
    : TKey extends string
      ? ConfigPathValue<PluginConfigNamespace<TPlugin>, TKey, T>
      : T;

/** The registered contract when `TServiceName` is a registered service of the plugin, `T` otherwise. */
type PluginServiceLookup<TPlugin extends string, TServiceName, T> = [
  ServiceNames<TPlugin>,
] extends [never]
  ? T
  : SuggestedString<ServiceNames<TPlugin>> extends TServiceName
    ? T
    : TServiceName extends ServiceNames<TPlugin>
      ? ServiceFor<`plugin::${TPlugin}.${TServiceName}`>
      : T;

export type Plugin<TName extends string = string> = Omit<
  Module,
  'routes' | 'service' | 'config'
> & {
  routes: Route[] | Record<string, Router>;
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
  [key: string]: any;
};
