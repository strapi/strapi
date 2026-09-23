import type { Strapi as StrapiInstance } from './core';

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
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      strapi: StrapiInstance;
    }
  }
}
