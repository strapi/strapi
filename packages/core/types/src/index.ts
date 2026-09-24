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
   *
   * @example
   * ```ts
   * declare global {
   *   namespace Strapi {
   *     namespace Registries {
   *       interface DefaultServices {
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
       * Application entries in {@link Services} take precedence over these defaults.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface DefaultServices {}

      /**
       * Application service contracts and overrides, keyed by full service UID.
       * Each entry replaces the entire default contract for that UID; it is not intersected with it.
       * Services absent from both registries retain their existing permissive types.
       *
       * Not to be confused with the legacy `Public.Services`, which lists service UIDs
       * and narrows `UID.Service` when augmented.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Services {}

      /**
       * Resolved configuration contracts supplied by Strapi and plugin packages, keyed by
       * config namespace (e.g. `'plugin::my-plugin'`).
       * Application entries in {@link Configs} take precedence over these defaults.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface DefaultConfigs {}

      /**
       * Application configuration contracts and overrides, keyed by config namespace.
       * Each entry replaces the entire default contract for that namespace; it is not intersected with it.
       * Namespaces absent from both registries retain their existing permissive types.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Configs {}

      /**
       * Controller contracts supplied by Strapi and plugin packages, keyed by full controller UID
       * (e.g. `'plugin::my-plugin.my-controller'`).
       * Application entries in {@link Controllers} take precedence over these defaults.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface DefaultControllers {}

      /**
       * Application controller contracts and overrides, keyed by full controller UID.
       * Each entry replaces the entire default contract for that UID; it is not intersected with it.
       * Controllers absent from both registries retain their existing permissive types.
       *
       * Not to be confused with the legacy `Public.Controllers`, which lists controller UIDs
       * and narrows `UID.Controller` when augmented.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Controllers {}

      /**
       * Policies supplied by Strapi and plugin packages, keyed by full policy UID
       * (e.g. `'admin::hasPermissions'`). Each value is the config the policy accepts,
       * `undefined` when it takes none.
       * Application entries in {@link Policies} take precedence over these defaults.
       *
       * Unlike the other registries, policy references are checked as a complete inventory:
       * once any policy is registered, typed route configs accept registered policies only.
       * A package that registers policies must register all of them.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface DefaultPolicies {}

      /**
       * Application policies and overrides, keyed by full policy UID. Each value is the config
       * the policy accepts. An entry replaces the default config contract for that UID.
       */
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface Policies {}
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      strapi: StrapiInstance;
    }
  }
}
