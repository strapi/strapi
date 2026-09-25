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
 * A loaded module. `TNamespace` is its runtime namespace, e.g. `plugin::i18n` or `api::article`:
 * a literal namespace types the `services`, `controllers` and `policies` maps from the registries.
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

  /** Registered controller names of the module are listed for completion; the result keeps the legacy type. */
  controller<T extends Controller>(
    name: SuggestedString<ModuleEntryNames<RegisteredControllerUID, TNamespace>>
  ): T;
  /** Registered service names of the module are listed for completion; the result keeps the legacy type. */
  service<T extends Service>(
    name: SuggestedString<ModuleEntryNames<RegisteredServiceUID, TNamespace>>
  ): T;
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
