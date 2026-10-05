import type { PropertyPath } from 'lodash';
import type { Router, Controller, Service, Policy, Middleware, Strapi } from '.';
import type { ContentType } from '../schema';
import type { ControllerFor, RegisteredControllerUID } from './controller';
import type {
  MiddlewareConfigFor,
  MiddlewareFactory,
  RegisteredMiddlewareName,
} from './middleware';
import type { PolicyConfigFor, RegisteredPolicyName } from './policy';
import type { RegisteredServiceUID, ServiceFor } from './service';
import type { SuggestedString } from '../utils/string';
import type { IsDynamicName, IsStrict, RegisteredRecord } from './strictness';

/**
 * Names of the registry entries under a module namespace, e.g. `locales` for `plugin::i18n.locales`
 * in the `plugin::i18n` namespace. A dynamic namespace has no known entries.
 */
type ModuleEntryNames<TUID, TNamespace extends string> =
  IsDynamicName<TNamespace> extends true
    ? never
    : TUID extends `${TNamespace}.${infer TName}`
      ? TName
      : never;

/**
 * The module's services keyed by name. With strict types enabled, registered names resolve to their
 * contracts; other names, literal or dynamic, resolve to the legacy service, like `strapi.services`.
 */
export type ModuleServiceMap<TNamespace extends string> = IsStrict extends false
  ? Record<string, Service>
  : RegisteredRecord<
      {
        [TName in ModuleEntryNames<
          RegisteredServiceUID,
          TNamespace
        >]: ServiceFor<`${TNamespace}.${TName}`>;
      },
      Service
    >;

/**
 * The module's controllers keyed by name. With strict types enabled, registered names resolve to their
 * contracts; other names, literal or dynamic, resolve to the legacy controller, like `strapi.controllers`.
 */
export type ModuleControllerMap<TNamespace extends string> = IsStrict extends false
  ? Record<string, Controller>
  : RegisteredRecord<
      {
        [TName in ModuleEntryNames<
          RegisteredControllerUID,
          TNamespace
        >]: ControllerFor<`${TNamespace}.${TName}`>;
      },
      Controller
    >;

/**
 * The module's policies keyed by name. With strict types enabled, registered names resolve to a policy
 * that receives their config contract; other names resolve to the legacy policy, like `strapi.policies`.
 */
export type ModulePolicyMap<TNamespace extends string> = IsStrict extends false
  ? Record<string, Policy>
  : RegisteredRecord<
      {
        [TName in ModuleEntryNames<RegisteredPolicyName, TNamespace>]: Policy<
          PolicyConfigFor<Extract<`${TNamespace}.${TName}`, RegisteredPolicyName>>
        >;
      },
      Policy
    >;

/**
 * The module's middlewares keyed by name. With strict types enabled, registered names resolve to a
 * factory that receives their config contract; other names resolve to the legacy middleware.
 */
export type ModuleMiddlewareMap<TNamespace extends string> = IsStrict extends false
  ? Record<string, Middleware>
  : RegisteredRecord<
      {
        [TName in ModuleEntryNames<RegisteredMiddlewareName, TNamespace>]: MiddlewareFactory<
          MiddlewareConfigFor<Extract<`${TNamespace}.${TName}`, RegisteredMiddlewareName>>
        >;
      },
      Middleware
    >;

/**
 * Whether the module's `service`, `controller`, `policy` and `middleware` lookups resolve registered contracts, with
 * strict types enabled: API modules, e.g. `strapi.api(name)`. Other modules, such as `strapi.admin`,
 * keep the legacy lookups.
 */
type IsClosedModule<TNamespace extends string> = [TNamespace] extends [`api::${string}`]
  ? true
  : false;

/** Default result of a module lookup without type argument: `unknown` for closed modules. */
type ModuleLookupDefault<TNamespace extends string, TLegacy> =
  IsClosedModule<TNamespace> extends true ? unknown : TLegacy;

/** A name accepted by a module lookup. Registered names of the module are listed for completion. */
type ModuleLookupName<TUID, TNamespace extends string> = SuggestedString<
  ModuleEntryNames<TUID, TNamespace>
>;

/**
 * Return type of a closed module lookup: `T` when the name kept its wide default, which happens when
 * the caller passes an explicit type argument or a dynamic name, `TRegistered` for a registered
 * name, and `T` otherwise. `T` is not inferred from a type annotation, as in `strapi.service(uid)`.
 */
type ClosedModuleLookup<TUID, TNamespace extends string, TName, T, TRegistered> =
  ModuleLookupName<TUID, TNamespace> extends TName
    ? NoInfer<T>
    : TName extends ModuleEntryNames<TUID, TNamespace>
      ? TRegistered
      : NoInfer<T>;

/** Return type of `module.service<T>(name)`: `T` unless the module is closed. */
type ModuleServiceLookup<TNamespace extends string, TName, T> =
  IsClosedModule<TNamespace> extends false
    ? T
    : ClosedModuleLookup<
        RegisteredServiceUID,
        TNamespace,
        TName,
        T,
        ServiceFor<`${TNamespace}.${TName & string}`>
      >;

/** Return type of `module.controller<T>(name)`: `T` unless the module is closed. */
type ModuleControllerLookup<TNamespace extends string, TName, T> =
  IsClosedModule<TNamespace> extends false
    ? T
    : ClosedModuleLookup<
        RegisteredControllerUID,
        TNamespace,
        TName,
        T,
        ControllerFor<`${TNamespace}.${TName & string}`>
      >;

/**
 * Return type of `module.policy<T>(name)`: `T` unless the module is closed. A registered name resolves
 * to a policy that receives its config contract, like the `policies` map.
 */
type ModulePolicyLookup<TNamespace extends string, TName, T> =
  IsClosedModule<TNamespace> extends false
    ? T
    : ClosedModuleLookup<
        RegisteredPolicyName,
        TNamespace,
        TName,
        T,
        Policy<PolicyConfigFor<Extract<`${TNamespace}.${TName & string}`, RegisteredPolicyName>>>
      >;

/**
 * Return type of `module.middleware<T>(name)`: `T` unless the module is closed. A registered name
 * resolves to a factory that receives its config contract, like the `middlewares` map.
 */
type ModuleMiddlewareLookup<TNamespace extends string, TName, T> =
  IsClosedModule<TNamespace> extends false
    ? T
    : ClosedModuleLookup<
        RegisteredMiddlewareName,
        TNamespace,
        TName,
        T,
        MiddlewareFactory<
          MiddlewareConfigFor<Extract<`${TNamespace}.${TName & string}`, RegisteredMiddlewareName>>
        >
      >;

/**
 * Module lookups without strict mode: develop's signatures, so mocks and `@ts-expect-error` lines
 * written for develop keep compiling. Develop has no `policy` or `middleware` lookup, so object
 * literals typed `Core.Module` need none.
 */
type LegacyModuleLookups = {
  controller<T extends Controller>(name: string): T;
  service<T extends Service>(name: string): T;
};

/** Module lookups with strict mode: registered names of API modules resolve to their contracts. */
type StrictModuleLookups<TNamespace extends string> = {
  /**
   * Resolves the registered contract of the controller `name` in an API module. An explicit type
   * argument (`controller<MyController>(name)`) wins over the registries. Registered controller names
   * of the module are listed for completion.
   */
  controller<
    T extends ModuleLookupDefault<TNamespace, Controller> = ModuleLookupDefault<
      TNamespace,
      Controller
    >,
    TName extends ModuleLookupName<RegisteredControllerUID, TNamespace> = ModuleLookupName<
      RegisteredControllerUID,
      TNamespace
    >,
  >(
    name: TName
  ): ModuleControllerLookup<TNamespace, TName, T>;
  /**
   * Resolves the registered contract of the service `name` in an API module. An explicit type
   * argument (`service<MyService>(name)`) wins over the registries. Registered service names of the
   * module are listed for completion.
   */
  service<
    T extends ModuleLookupDefault<TNamespace, Service> = ModuleLookupDefault<TNamespace, Service>,
    TName extends ModuleLookupName<RegisteredServiceUID, TNamespace> = ModuleLookupName<
      RegisteredServiceUID,
      TNamespace
    >,
  >(
    name: TName
  ): ModuleServiceLookup<TNamespace, TName, T>;
  /**
   * Resolves the registered policy of the relative name `name`, i.e. `<namespace>.<name>` as at
   * runtime, which receives its config contract, in an API module. An explicit type argument
   * (`policy<MyPolicy>(name)`) wins over the registries. Otherwise, returns the legacy `Policy`.
   * Registered policy names of the module are listed for completion.
   */
  policy<
    // Any policy, whatever its config, for legacy lookups, as in `strapi.policy`.
    T extends ModuleLookupDefault<TNamespace, Policy<never>> = ModuleLookupDefault<
      TNamespace,
      Policy
    >,
    TName extends ModuleLookupName<RegisteredPolicyName, TNamespace> = ModuleLookupName<
      RegisteredPolicyName,
      TNamespace
    >,
  >(
    name: TName
  ): ModulePolicyLookup<TNamespace, TName, T>;
  /**
   * Resolves the registered middleware of the relative name `name`, i.e. `<namespace>.<name>` as at
   * runtime, a factory that receives its config contract, in an API module. An explicit type
   * argument (`middleware<MyFactory>(name)`) wins over the registries. Otherwise, returns the legacy
   * `Middleware`. Registered middleware names of the module are listed for completion.
   */
  middleware<
    T extends ModuleLookupDefault<TNamespace, Middleware> = ModuleLookupDefault<
      TNamespace,
      Middleware
    >,
    TName extends ModuleLookupName<RegisteredMiddlewareName, TNamespace> = ModuleLookupName<
      RegisteredMiddlewareName,
      TNamespace
    >,
  >(
    name: TName
  ): ModuleMiddlewareLookup<TNamespace, TName, T>;
};

type ModuleLookups<TNamespace extends string> = IsStrict extends false
  ? LegacyModuleLookups
  : StrictModuleLookups<TNamespace>;

/**
 * A loaded module. `TNamespace` is its runtime namespace, e.g. `plugin::i18n` or `api::article`:
 * with strict types enabled, a literal namespace types the `services`, `controllers`, `policies` and
 * `middlewares` maps from the registries, and the `service`, `controller`, `policy` and `middleware`
 * lookups of API modules.
 */
export interface Module<TNamespace extends string = string> extends ModuleLookups<TNamespace> {
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  config<T = unknown>(key: PropertyPath, defaultVal?: T): T; // TODO: this mirrors ConfigProvider.get, we should use it directly
  routes: Record<string, Router>;
  controllers: ModuleControllerMap<TNamespace>;
  services: ModuleServiceMap<TNamespace>;
  policies: ModulePolicyMap<TNamespace>;
  middlewares: ModuleMiddlewareMap<TNamespace>;
  contentTypes: Record<string, { schema: ContentType }>;
}

/** The API name of an `api::<api>.<name>` UID. */
type ApiNameOf<TUID> = TUID extends `api::${infer TApi}.${string}` ? TApi : never;

/** APIs with at least one registered service, controller, policy or middleware contract. */
export type RegisteredApiName = ApiNameOf<
  RegisteredServiceUID | RegisteredControllerUID | RegisteredPolicyName | RegisteredMiddlewareName
>;

/**
 * APIs keyed by name, e.g. `strapi.apis`. With strict types enabled, a registered API resolves to
 * `Module<'api::<name>'>`, like `strapi.api(name)`; other names, literal or dynamic, resolve to `Module`.
 */
export type ApiMap = IsStrict extends false
  ? Record<string, Module>
  : RegisteredRecord<{ [TApi in RegisteredApiName]: Module<`api::${TApi}`> }, Module>;
