import type { Service, Controller, Policy, Middleware } from '../core';
import type { UID } from '../internal';
import type { ComponentSchema, ContentTypeSchema } from '../struct';

/**
 * Aggregates and interfaces the schemas of various content types under unique identifiers.
 *
 * It allows mapping between unique identifiers of content types and their respective schemas.
 *
 * @example
 * Example usage of ContentTypeSchemas:
 * ```ts
 * declare module '@strapi/strapi' {
 *   export namespace Public {
 *     export interface ContentTypeSchemas {
 *       'api::foo.foo': { ... }
 *     }
 *   }
 * }
 * ```
 *
 * Strict mode ignores this registry and reads `Strapi.Registries.AppContentTypeSchemas`, written by
 * type generation, over `Strapi.Registries.PackageContentTypeSchemas`, declared by packages.
 *
 * @deprecated With `typescript.strictTypes`, type generation writes the application's schemas and
 * applications do not declare them by hand. `Public` registries will be removed in the next major
 * version.
 */
export interface ContentTypeSchemas {
  [TKey: UID.ContentType]: ContentTypeSchema;
}

/**
 * Aggregates and interfaces the schemas of various components under unique identifiers.
 *
 * It allows mapping between unique identifiers of components and their respective schemas.
 *
 * @example
 * Example usage of ComponentSchemas:
 * ```ts
 * declare module '@strapi/strapi' {
 *   export namespace Public {
 *     export interface ComponentSchemas {
 *       'default.foo': { ... }
 *     }
 *   }
 * }
 * ```
 *
 * Strict mode ignores this registry and reads `Strapi.Registries.ComponentSchemas`.
 *
 * @deprecated With `typescript.strictTypes`, declare `Strapi.Registries.ComponentSchemas` instead. `Public` registries will be
 * removed in the next major version.
 */
export interface ComponentSchemas {
  [TKey: UID.Component]: ComponentSchema;
}

/**
 * Shared service registry
 *
 * Augmenting it narrows `UID.Service` to the declared keys. Strict service contracts
 * are declared in the global `Strapi.Registries.AppServices` and `Strapi.Registries.PackageServices`.
 *
 * @deprecated With `typescript.strictTypes`, declare `Strapi.Registries.AppServices` instead. `Public` registries will be
 * removed in the next major version.
 */
export interface Services {
  [uid: UID.Service]: Service;
}

/**
 * Shared controller registry
 *
 * @deprecated With `typescript.strictTypes`, declare `Strapi.Registries.AppControllers` instead. `Public` registries will be
 * removed in the next major version.
 */
export interface Controllers {
  [uid: UID.Controller]: Controller;
}

/**
 * Shared policy registry
 *
 * @deprecated With `typescript.strictTypes`, declare `Strapi.Registries.AppPolicies` instead. `Public` registries will be
 * removed in the next major version.
 */
export interface Policies {
  [uid: UID.Policy]: Policy;
}

/**
 * Shared middleware registry
 *
 * @deprecated With `typescript.strictTypes`, declare `Strapi.Registries.AppMiddlewares` instead. `Public` registries will be
 * removed in the next major version.
 */
export interface Middlewares {
  [uid: UID.Middleware]: Middleware;
}
