import type { Service, Controller, Policy, Middleware } from '../core';
import type { UID } from '../internal';
import type { ComponentSchema, ContentTypeSchema } from '../struct';

export interface ContentTypeSchemas {
  [TKey: UID.ContentType]: ContentTypeSchema;
}

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
