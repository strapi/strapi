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
 *   export module Public {
 *     export module Registries {
 *       export interface ContentTypesSchemas {
 *         'api::foo.foo': { ... }
 *       }
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
 *   export module Public {
 *     export module Registries {
 *       export interface ComponentSchemas {
 *         'default.foo': { ... }
 *       }
 *     }
 *   }
 * }
 * ```
 */
export interface ComponentSchemas {
  [TKey: UID.Component]: ComponentSchema;
}

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
