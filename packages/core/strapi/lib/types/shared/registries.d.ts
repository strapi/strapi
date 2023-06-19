import type { Common, Schema, UID } from '@strapi/strapi';

/**
 * Shared service registry
 */
export interface Services {
  [uid: UID.Service]: Common.Service;
}

/**
 * Shared controller registry
 */
export interface Controllers {
  [uid: UID.Controller]: Common.Controller;
}

/**
 * Shared policy registry
 */
export interface Policies {
  // TODO: Create generic policy type
  [uid: UID.Policy]: unknown;
}

/**
 * Shared middleware registry
 */
export interface Middlewares {
  // TODO: Create generic middleware type
  [uid: UID.Middleware]: unknown;
}

/**
 * Shared content-types registry
 */
export interface ContentTypes {
  [key: UID.ContentType]: Schema.ContentType;
}

/**
 * Shared component registry
 */
export interface Components {
  [key: UID.Component]: Schema.Component;
}
