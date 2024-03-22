import type { Context } from 'koa';

import type * as UID from '../../uid';
import type { MatchFirst, Test } from '../../utils';

import type { ControllerHandler } from '../controller';

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
  [name: string]: ControllerHandler<unknown>;
};

/**
 * Core-API collection type controller
 */
export interface CollectionType extends Base {
  find: ControllerHandler<unknown>;
  findOne: ControllerHandler<unknown>;
  create: ControllerHandler<unknown>;
  update: ControllerHandler<unknown>;
  delete: ControllerHandler<unknown>;
}

/**
 * Core-API single type controller
 */
export interface SingleType extends Base {
  find: ControllerHandler<unknown>;
  update: ControllerHandler<unknown>;
  delete: ControllerHandler<unknown>;
}

export type ContentType<T extends UID.ContentType> = MatchFirst<
  [Test<UID.IsCollectionType<T>, CollectionType>, Test<UID.IsSingleType<T>, SingleType>],
  Base
>;

export type Extendable<T extends UID.ContentType> = Partial<ContentType<T>> & Generic;
