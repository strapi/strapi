import type { Context } from 'koa';
import type { Common, Utils } from '..';

/**
 * Base Core-API controller type
 *
 * TODO: Make use of the T generic to type the other methods based on the given content type
 */
export interface Base {
  // TODO: Use actual entities instead of regular object
  transformResponse<TData>(data: TData, meta?: object): unknown;
  sanitizeOutput<TData>(data: TData, ctx: Context): Promise<unknown>;
  sanitizeInput<TData>(data: TData, ctx: Context): Promise<unknown>;
  sanitizeQuery(ctx: Context): Promise<Record<string, unknown>>;

  validateInput<TData>(data: TData, ctx: Context): Promise<void>;
  validateQuery(ctx: Context): Promise<void>;
}

/**
 * Generic controller structure
 */
export type Generic = {
  [name: string]: Common.ControllerHandler<unknown>;
};

/**
 * Core-API collection type controller
 */
export interface CollectionType extends Base {
  find: Common.ControllerHandler<unknown>;
  findOne: Common.ControllerHandler<unknown>;
  create: Common.ControllerHandler<unknown>;
  update: Common.ControllerHandler<unknown>;
  delete: Common.ControllerHandler<unknown>;
}

/**
 * Core-API single type controller
 */
export interface SingleType extends Base {
  find: Common.ControllerHandler<unknown>;
  update: Common.ControllerHandler<unknown>;
  delete: Common.ControllerHandler<unknown>;
}

export type ContentType<T extends Common.UID.ContentType> = Utils.Expression.MatchFirst<
  [
    Utils.Expression.Test<Common.UID.IsCollectionType<T>, CollectionType>,
    Utils.Expression.Test<Common.UID.IsSingleType<T>, SingleType>
  ],
  Base
>;

export type Extendable<T extends Common.UID.ContentType> = Partial<ContentType<T>> & Generic;
