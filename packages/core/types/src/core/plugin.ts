import type { DefaultServiceRegistry, ServiceRegistry } from '..';
import type { Module, Route, Router, Service, ServiceFor } from '.';

type ServiceNames<TPlugin extends string> = string extends TPlugin
  ? never
  : keyof {
      [TUID in
        | keyof ServiceRegistry
        | keyof DefaultServiceRegistry as TUID extends `plugin::${TPlugin}.${infer TService}`
        ? TService
        : never]: ServiceFor<TUID>;
    };

export type Plugin<TName extends string = string> = Omit<Module, 'routes' | 'service'> & {
  routes: Route[] | Record<string, Router>;
  service<TServiceName extends ServiceNames<TName>>(
    name: TServiceName
  ): ServiceFor<`plugin::${TName}.${TServiceName}`>;
  service<T extends Service>(name: string): T;
  [key: string]: any;
};
