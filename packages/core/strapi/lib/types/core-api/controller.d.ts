import type { Common, Schema, Shared } from '@strapi/strapi';
import type { ExtendableContext } from 'koa';

/**
 * Base Core-API controller type
 *
 * TODO: Make use of the T generic to type the other methods based on the given content type
 */
export interface Base {
  // TODO: Use actual entities instead of regular object
  transformResponse<U, P>(data: U, meta: object): P;
  sanitizeOutput<U>(data: U, ctx: ExtendableContext): Promise<U>;
  sanitizeInput<U>(data: U, ctx: ExtendableContext): Promise<U>;
  sanitizeQuery<U>(data: U, ctx: ExtendableContext): Promise<U>;
}

/**
 * Generic controller structure
 */
export type Generic = {
  [name: string]: Common.ControllerHandler;
};

/**
 * Core-API collection type controller
 */
export type CollectionType = Base & {
  find?: Common.ControllerHandler;
  findOne?: Common.ControllerHandler;
  create?: Common.ControllerHandler;
  update?: Common.ControllerHandler;
  delete?: Common.ControllerHandler;
};

/**
 * Core-API single type controller
 */
export type SingleType = Base & {
  find?: Common.ControllerHandler;
  update?: Common.ControllerHandler;
  delete?: Common.ControllerHandler;
};

export type ContentType<T extends Common.UID.ContentType> =
  // Checks that the content type exists in the shared registry
  Shared.ContentTypes[T] extends infer S extends Schema.Schema
    ? S extends Schema.CollectionType
      ? CollectionType
      : S extends Schema.SingleType
      ? SingleType
      : // This should never happen. It would mean a schema (other than collection type
        // or a single type has been registered to the shared content-type registry)
        never
    : // If it doesn't exist, return a base controller
      Base;

export type Extendable<T extends Common.UID.ContentType> = ContentType<T> & Generic;
