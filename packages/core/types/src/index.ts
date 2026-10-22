import type { Strapi as StrapiInstance } from './core/strapi';

export type * as Core from './core';
export type * as Data from './data';
export type * as Internal from './internal';
export type * as Modules from './modules';
export type * as Plugin from './plugin';
export type * as Public from './public';
export type * as Schema from './schema';
export type * as Utils from './utils';
export type * as Struct from './struct';
export type * as UID from './uid';

declare global {
  // eslint-disable-next-line vars-on-top,no-var
  var strapi: StrapiInstance;

  /**
   * Type registries shared by Strapi, plugins and applications.
   *
   * They live in the global scope so that every package augments one declaration,
   * whatever module it can resolve and in whatever order declaration files are loaded.
   * Packages expose their contracts through their normal types entry. Lookups use these
   * contracts only when the application augments `Settings` with `strict: true`.
   * Strapi and plugin packages augment `Package*` registries. Applications augment `App*`
   * registries to add contracts or replace the package contract for a key.
   *
   * @example
   * ```ts
   * declare global {
   *   namespace Strapi {
   *     namespace Registries {
   *       interface PackageServices {
   *         'plugin::my-plugin.my-service': MyService;
   *       }
   *     }
   *   }
   * }
   * ```
   */
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * Application-wide type settings. Add `strict: true` to use registered contracts.
       * Loading a package's contracts alone does not enable strict lookups.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Settings {}

      /**
       * Service contracts supplied by Strapi and plugin packages, keyed by full service UID.
       * Application entries in {@link AppServices} take precedence over these contracts.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PackageServices {}

      /**
       * Application service contracts and overrides, keyed by full service UID.
       * Each entry replaces the entire package contract for that UID; it is not intersected with it.
       * Services absent from both registries retain their existing permissive types.
       *
       * Not to be confused with the legacy `Public.Services`, which lists service UIDs
       * and narrows `UID.Service` when augmented.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface AppServices {}

      /**
       * Application services registered with the type their module provides, keyed by full service
       * UID. Type generation is the only producer: `types/generated/services.d.ts` lists every
       * service whose module has no `ServiceContract` export. With strict types enabled,
       * `Core.ServiceFactory` rejects these UIDs, whose registered type is read from the factory
       * itself. Values are not read.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface InferredServices {}

      /**
       * Resolved configuration contracts supplied by Strapi and plugin packages, keyed by
       * config namespace (e.g. `'plugin::my-plugin'`).
       * Application entries in {@link AppConfigs} take precedence over these contracts.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PackageConfigs {}

      /**
       * Application configuration contracts and overrides, keyed by config namespace.
       * Each entry replaces the entire package contract for that namespace; it is not intersected with it.
       * Namespaces absent from both registries retain their existing permissive types.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface AppConfigs {}

      /**
       * Controller contracts supplied by Strapi and plugin packages, keyed by full controller UID
       * (e.g. `'plugin::my-plugin.my-controller'`).
       * Application entries in {@link AppControllers} take precedence over these contracts.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PackageControllers {}

      /**
       * Application controller contracts and overrides, keyed by full controller UID.
       * Each entry replaces the entire package contract for that UID; it is not intersected with it.
       * Controllers absent from both registries retain their existing permissive types.
       *
       * Not to be confused with the legacy `Public.Controllers`, which lists controller UIDs
       * and narrows `UID.Controller` when augmented.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface AppControllers {}

      /**
       * Application controllers registered with the type their module provides, keyed by full
       * controller UID. Type generation is the only producer: `types/generated/controllers.d.ts`
       * lists every controller whose module has no `ControllerContract` export. With strict types
       * enabled, `Core.ControllerFactory` rejects these UIDs, whose registered type is read from the
       * factory itself. Values are not read.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface InferredControllers {}

      /**
       * Policies supplied by Strapi and plugin packages, keyed by full policy UID
       * (e.g. `'admin::hasPermissions'`). Each value is the config the policy accepts,
       * `undefined` when it takes none.
       * Application entries in {@link AppPolicies} take precedence over these contracts.
       *
       * With strict types enabled, policy references are checked as a complete inventory:
       * once any policy is registered, typed route configs accept registered policies only.
       * A package that registers policies must register all of them.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PackagePolicies {}

      /**
       * Application policies and overrides, keyed by full policy UID. Each value is the config
       * the policy accepts. An entry replaces the package config contract for that UID.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface AppPolicies {}

      /**
       * Middlewares supplied by Strapi and plugin packages, keyed by full middleware UID
       * (e.g. `'strapi::cors'`, `'admin::rateLimit'`). Each value is the config the factory accepts
       * as its first parameter, `undefined` when it takes none.
       * Application entries in {@link AppMiddlewares} take precedence over these contracts.
       *
       * With strict types enabled, middleware references are checked as a complete inventory:
       * once any middleware is registered, typed route configs accept registered middleware names only.
       * A package that registers middlewares must register all of them.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PackageMiddlewares {}

      /**
       * Application middlewares and overrides, keyed by full middleware UID (`global::<name>`,
       * `api::<api>.<name>`). Each value is the config the factory accepts. An entry replaces the
       * package config contract for that UID.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface AppMiddlewares {}

      /**
       * Server hook contracts keyed by hook UID (e.g. `'strapi::content-types.beforeSync'`), read by
       * `strapi.hook(uid)`, `strapi.hooks` and the hooks registry (`strapi.get('hooks')`).
       * The package that sets a hook and calls it registers its contract: the hook kind and the
       * context its handlers receive (e.g. `Core.AsyncParallelHook<TContext>`).
       *
       * Additive only, with no `Package*` and `App*` pair. Any code can replace a hook at runtime
       * (`set` overwrites it, `extend` wraps it), but the context is built by the single caller, so an
       * application cannot change what a package's hook passes. Applications and plugins register the
       * hooks they create and call. Redeclaring a UID with another contract is a type error.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Hooks {}

      /**
       * Core store values keyed by the storage key the runtime builds from the params of
       * `strapi.store`: `<type>_<name>_<key>`, or `<type>_<key>` without a name (e.g.
       * `'plugin_i18n_default_locale'` for `{ type: 'plugin', name: 'i18n', key: 'default_locale' }`).
       * Keys built at runtime register a template-literal key, e.g.
       * `` [key: `core_admin_homepage-layout:${string}`]: HomepageLayout ``.
       *
       * The runtime stores values as JSON, so each value is the JSON shape the owner writes: a `Date`
       * is read back as a string, `undefined` properties are dropped. With strict types enabled, reads
       * of a registered key resolve to its value or `null`, and writes take its value.
       *
       * Additive only, with no `Package*` and `App*` pair. A row is data shared by every reader: any
       * code can write it, and its owner keeps reading it with its own contract, so an application
       * cannot replace the contract of a package key. The package that writes and reads a key
       * registers it; applications register their own keys. Redeclaring a key with another value is
       * a type error.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Stores {}

      /**
       * Event payloads keyed by event name (e.g. `'entry.create'`), read by `strapi.eventHub`.
       * Each value is the tuple of arguments an emit passes after the name: the union of every
       * payload the producers of the name pass (e.g. `[{ user: User } | { users: User[] }]`).
       *
       * Additive only, with no `Package*` and `App*` pair. Nothing defines an event at runtime: any
       * code emits any name. The package that emits a name registers it, with the payload of each of
       * its producers; applications register the events they emit. A listener can then rely on the
       * registered payload, so with strict types an emit of a registered name must match it.
       * Redeclaring a name with another payload is a type error.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Events {}

      /**
       * Content-type schemas keyed by UID, read in strict mode instead of `Public.ContentTypeSchemas`.
       * Type generation is the only producer: it writes `types/generated/contentTypes.d.ts`.
       * Applications do not override schemas, so there is no `Package*` and `App*` pair.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface ContentTypeSchemas {}

      /**
       * Component schemas keyed by UID, read in strict mode instead of `Public.ComponentSchemas`.
       * Type generation is the only producer: it writes `types/generated/components.d.ts`.
       * Applications do not override schemas, so there is no `Package*` and `App*` pair.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface ComponentSchemas {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      strapi: StrapiInstance;
    }
  }
}
