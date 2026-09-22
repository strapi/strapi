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
 * declare module '@strapi/types' {
 *   export namespace Public {
 *     export interface ContentTypeSchemas {
 *       'api::foo.foo': { ... }
 *     }
 *   }
 * }
 * ```
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
 * declare module '@strapi/types' {
 *   export namespace Public {
 *     export interface ComponentSchemas {
 *       'default.foo': { ... }
 *     }
 *   }
 * }
 * ```
 */
export interface ComponentSchemas {
  [TKey: UID.Component]: ComponentSchema;
}

/**
 * Service contracts supplied by Strapi and plugin packages.
 * Packages augment Public.DefaultServiceRegistry in `declare module '@strapi/types'` using full UIDs.
 * Application entries in ServiceRegistry take precedence over these defaults.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DefaultServiceRegistry {}

/**
 * Application service contracts and overrides, keyed by full service UID.
 * Applications augment Public.ServiceRegistry in `declare module '@strapi/strapi'`.
 * Each entry replaces the entire default contract for that UID; it is not intersected with it.
 * Services absent from both registries retain their existing permissive types.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ServiceRegistry {}

/**
 * Shared service registry
 */
export interface Services {
  [uid: UID.Service]: Service;
}

/**
 * Shared controller registry
 */
export interface Controllers {
  [uid: UID.Controller]: Controller;
}

/**
 * Shared policy registry
 */
export interface Policies {
  [uid: UID.Policy]: Policy;
}

/**
 * Shared middleware registry
 */
export interface Middlewares {
  [uid: UID.Middleware]: Middleware;
}
