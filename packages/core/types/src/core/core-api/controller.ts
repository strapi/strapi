import type { Context } from 'koa';

import type * as UID from '../../uid';
import type { MatchFirst, Test } from '../../utils';

import type { ControllerHandler } from '../controller';
import type { IsStrict } from '../strictness';

/**
 * Base Core-API controller type
 *
 * TODO: Make use of the T generic to type the other methods based on the given content type
 */
export interface Base {
  // TODO: Use actual entities instead of regular object
  transformResponse<TData>(data: TData, meta?: object): unknown;
  sanitizeOutput<TData>(data: TData, ctx: Context): Promise<unknown>;
  /** With strict types, the sanitized data keeps the type of `data` (`any` for a request body). */
  sanitizeInput<TData>(
    data: TData,
    ctx: Context
  ): Promise<IsStrict extends false ? unknown : TData>;
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

/**
 * Configuration accepted by the core controller factory.
 *
 * Every action is optional, but `this` is the full controller: the base helpers
 * (`sanitizeOutput`, `transformResponse`, ...) are always provided at runtime, and any
 * other action stays reachable through `Generic`.
 *
 * With strict types, `this` adds `TThis`, not `TController`. A factory that infers `TController`
 * from this config passes a `TThis` that defaults to `TController` and has no inference site. An
 * action that returns a value computed from `this` makes TypeScript resolve `this` before the
 * config's type is known: it then fixes `TThis` to what `TController` holds so far (its
 * constraint), and `TController` stays free to be inferred from the whole config. With
 * `TController` in `this`, TypeScript fixes `TController` itself to its constraint, and the
 * factory drops the custom actions. Do not pass `TThis`: leave it to its default.
 */
export type FactoryConfig<
  T extends UID.ContentType,
  TController extends Extendable<T> = Extendable<T>,
  TThis = TController,
> = Partial<Extendable<T> & TController> &
  ThisType<ContentType<T> & Generic & (IsStrict extends true ? TThis : TController)>;
