import type { PropertyPath } from 'lodash';
import type { Router, Controller, Service, Policy, Middleware, Strapi } from '.';
import type { ContentType } from '../schema';
import type { ControllerFor, RegisteredControllerUID } from './controller';
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
 * Whether the module's `service` and `controller` lookups resolve registered contracts: API modules,
 * e.g. `strapi.api(name)`, with strict types enabled. Other modules, such as `strapi.admin`, keep the
 * legacy lookups.
 */
type IsClosedModule<TNamespace extends string> = IsStrict extends false
  ? false
  : [TNamespace] extends [`api::${string}`]
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
 * A loaded module. `TNamespace` is its runtime namespace, e.g. `plugin::i18n` or `api::article`:
 * a literal namespace types the `services`, `controllers` and `policies` maps from the registries,
 * and the `service` and `controller` lookups of API modules with strict types enabled.
 */
export interface Module<TNamespace extends string = string> {
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  config<T = unknown>(key: PropertyPath, defaultVal?: T): T; // TODO: this mirrors ConfigProvider.get, we should use it directly
  routes: Record<string, Router>;
  controllers: ModuleControllerMap<TNamespace>;
  services: ModuleServiceMap<TNamespace>;
  policies: ModulePolicyMap<TNamespace>;
  middlewares: Record<string, Middleware>;
  contentTypes: Record<string, { schema: ContentType }>;

  /**
   * Resolves the registered contract of the controller `name` in an API module, with strict types
   * enabled. An explicit type argument (`controller<MyController>(name)`) wins over the registries.
   * Registered controller names of the module are listed for completion.
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
   * Resolves the registered contract of the service `name` in an API module, with strict types
   * enabled. An explicit type argument (`service<MyService>(name)`) wins over the registries.
   * Registered service names of the module are listed for completion.
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
}

/** The API name of an `api::<api>.<name>` UID. */
type ApiNameOf<TUID> = TUID extends `api::${infer TApi}.${string}` ? TApi : never;

/** APIs with at least one registered service, controller or policy contract. */
export type RegisteredApiName = ApiNameOf<
  RegisteredServiceUID | RegisteredControllerUID | RegisteredPolicyName
>;

/**
 * APIs keyed by name, e.g. `strapi.apis`. With strict types enabled, a registered API resolves to
 * `Module<'api::<name>'>`, like `strapi.api(name)`; other names, literal or dynamic, resolve to `Module`.
 */
export type ApiMap = IsStrict extends false
  ? Record<string, Module>
  : RegisteredRecord<{ [TApi in RegisteredApiName]: Module<`api::${TApi}`> }, Module>;
