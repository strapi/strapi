import type { Common, CoreApi, Utils } from '@strapi/strapi';
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

export type ContentType<T extends Common.UID.ContentType> = Utils.Expression.IfElse<
  Common.UID.IsCollectionType<T>,
  CollectionType,
  SingleType
>;

export type Extendable<T extends Common.UID.ContentType> = ContentType<T> & Generic;
