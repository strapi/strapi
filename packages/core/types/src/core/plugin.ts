import type { PropertyPath } from 'lodash';
import type { ConfigFor, ConfigNamespace, Module, Route, Router, Service, ServiceFor } from '.';

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

/** The registered value when `TKey` is a key of the plugin's config contract, `T` otherwise. */
type PluginConfigLookup<TPlugin extends string, TKey, T> = [
  PluginConfigNamespace<TPlugin>,
] extends [never]
  ? T
  : TKey extends keyof ConfigFor<PluginConfigNamespace<TPlugin>>
    ? ConfigFor<PluginConfigNamespace<TPlugin>>[TKey]
    : T;

export type Plugin<TName extends string = string> = Omit<
  Module,
  'routes' | 'service' | 'config'
> & {
  routes: Route[] | Record<string, Router>;
  config<T = unknown, TKey extends PropertyPath = PropertyPath>(
    key: TKey,
    defaultVal?: PluginConfigLookup<TName, TKey, T>
  ): PluginConfigLookup<TName, TKey, T>;
  service<TServiceName extends ServiceNames<TName>>(
    name: TServiceName
  ): ServiceFor<`plugin::${TName}.${TServiceName}`>;
  service<T extends Service>(name: string): T;
  [key: string]: any;
};
