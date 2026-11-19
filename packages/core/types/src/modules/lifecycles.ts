import type { Event as DatabaseEvent } from '@strapi/database';

import type * as Data from '../data';
import type * as Schema from '../schema';
import type * as UID from '../uid';
import type { Constants } from '../utils';
import type { IsDynamicName, IsStrict } from '../core/strictness';

/** A database lifecycle action: `before` or `after` one query of the database layer. */
export type Action = DatabaseEvent['action'];

/** The query an action runs around: `beforeCreate` and `afterCreate` run around `create`. */
export type Query<TAction extends Action> = TAction extends `${'before' | 'after'}${infer TName}`
  ? Uncapitalize<TName>
  : never;

/** The database metadata of a model, as `event.model` holds it. */
type DatabaseModel = DatabaseEvent['model'];

/**
 * The params of a query, as its caller passed them. The database layer does not type its callers,
 * so values are `unknown`. The Document Service passes `filters` as a function of the model.
 */
type QueryParams<TWhere> = {
  where?: TWhere;
  filters?: unknown;
  select?: unknown;
  populate?: unknown;
  orderBy?: unknown;
  groupBy?: unknown;
  limit?: unknown;
  offset?: unknown;
  _q?: unknown;
};

/**
 * The data a write passes for one entry of `TSchemaUID`, keyed by attribute.
 *
 * Known limit: values are `unknown`. The database layer passes its callers' values through: through
 * the Document Service, relations are `{ set | connect | disconnect: { id }[] }`, components
 * `{ id, __pivot }`, and dates whatever the caller passed (`string`, `Date` or a number); a raw
 * `strapi.db.query` call passes any value.
 */
export type EntryData<TSchemaUID extends UID.Schema> = {
  [TName in Schema.AttributeNames<TSchemaUID> | 'id' | 'documentId']?: unknown;
};

/**
 * A `where` on entries of `TSchemaUID`, keyed by attribute and logical operator.
 *
 * Known limit: values are `unknown`, as the caller passed them (see {@link EntryData}).
 */
export type Where<TSchemaUID extends UID.Schema> = {
  [
    TName in Schema.AttributeNames<TSchemaUID> | 'id' | 'documentId' | '$and' | '$or' | '$not'
  ]?: unknown;
};

/**
 * An entry the database returns: attributes are optional, as `select` and `populate` pick them.
 * `id` and `documentId` are required, as in `Data.ContentType`: a raw `strapi.db.query` call whose
 * `select` leaves them out returns entries without them.
 */
export type Entry<TSchemaUID extends UID.Schema> = Data.Entity<TSchemaUID>;

/** The params of each query. */
type ParamsByQuery<TData, TWhere> = {
  findOne: QueryParams<TWhere>;
  findMany: QueryParams<TWhere>;
  count: QueryParams<TWhere>;
  create: QueryParams<TWhere> & { data: TData };
  createMany: QueryParams<TWhere> & { data: TData[] };
  update: QueryParams<TWhere> & { data: TData };
  updateMany: QueryParams<TWhere> & { data: TData };
  delete: QueryParams<TWhere>;
  deleteMany: QueryParams<TWhere>;
};

/** The result of each query, for an entry of `TEntry`. */
type ResultByQuery<TEntry> = {
  /** `null` when no entry matched. */
  findOne: TEntry | null;
  findMany: TEntry[];
  count: number;
  /**
   * The entry read back after the insert. Known limit: the read back applies the caller's
   * `filters`, so it is `null` at runtime when they exclude the entry just written.
   */
  create: TEntry;
  createMany: { count: number; ids: Data.ID[] };
  /**
   * The entry read back after the update. `afterUpdate` does not run when no entry matched. Known
   * limit: the read back applies the caller's `filters`, so it is `null` at runtime when they
   * exclude the entry just written.
   */
  update: TEntry;
  updateMany: { count: number };
  /** The deleted entry. `afterDelete` does not run when no entry matched. */
  delete: TEntry;
  deleteMany: { count: number };
};

/** `before*` params are optional: the query checks `data` and `where` after the hook. */
type ParamsOf<TAction extends Action, TData, TWhere> = TAction extends `after${string}`
  ? ParamsByQuery<TData, TWhere>[Query<TAction>]
  : Partial<ParamsByQuery<TData, TWhere>[Query<TAction>]>;

type EventOf<TAction extends Action, TModel, TData, TWhere, TEntry> = {
  action: TAction;
  model: TModel;
  params: ParamsOf<TAction, TData, TWhere>;
  /** Shared by the `before*` and `after*` hooks of one query, per subscriber. */
  state: Record<string, unknown>;
} & (TAction extends `after${string}`
  ? { result: ResultByQuery<TEntry>[Query<TAction>] }
  : unknown);

/**
 * The event of `TAction` on the content type or component `TSchemaUID`.
 *
 * `params` are typed by key, with `unknown` values (see {@link EntryData}). `result` is typed from the
 * registered schema, on `after*` events only. `afterCreate` and `afterUpdate` results are non-null,
 * except when the caller's `filters` exclude the entry just written.
 */
export type Event<TSchemaUID extends UID.Schema, TAction extends Action> = EventOf<
  TAction,
  Omit<DatabaseModel, 'uid'> & { uid: TSchemaUID },
  EntryData<TSchemaUID>,
  Where<TSchemaUID>,
  Entry<TSchemaUID>
>;

/**
 * The event of `TAction` on any model: entries are records of unknown values. A union over actions,
 * narrowed by `event.action`.
 */
export type AnyEvent<TAction extends Action = Action> = TAction extends unknown
  ? EventOf<
      TAction,
      DatabaseModel,
      Record<string, unknown>,
      Record<string, unknown>,
      Record<string, unknown>
    >
  : never;

/** Whether `TModel` names a model whose schema is registered. */
type IsRegisteredModel<TModel extends string> =
  IsDynamicName<TModel> extends true
    ? false
    : TModel extends UID.Schema
      ? Constants.IsSchemaRegistered<TModel> extends Constants.True
        ? true
        : false
      : false;

/**
 * The event a hook of `TModel` receives: typed for registered models, `AnyEvent` otherwise.
 *
 * For several models, it is the union of their events. TypeScript does not narrow that union by
 * `event.model.uid` (a nested property): narrow the entry with `in`, or use one subscriber per model.
 */
export type ModelEvent<TModel extends string, TAction extends Action> = [TModel] extends [never]
  ? AnyEvent<TAction>
  : TModel extends unknown
    ? IsRegisteredModel<TModel> extends true
      ? Event<Extract<TModel, UID.Schema>, TAction>
      : AnyEvent<TAction>
    : never;

/** One hook per action, for the models `TModel`. The runtime awaits a hook and ignores its result. */
export type Hooks<TModel extends string> = {
  [TAction in Action]?: (event: ModelEvent<TModel, TAction>) => unknown;
};

/** A function subscriber: it receives every event of every model. */
export type SubscriberFn = (event: AnyEvent) => unknown;

/** A subscriber object. Without `models`, its hooks run for every model. */
export type SubscriberMap<TModel extends string = never> = {
  models?: readonly TModel[];
} & Hooks<TModel>;

/**
 * The lifecycles of the content type `TContentTypeUID`, the default export of its `lifecycles.ts`:
 *
 * ```ts
 * export default {
 *   beforeCreate(event) {},
 * } satisfies Core.Lifecycles<'api::article.article'>;
 * ```
 *
 * With strict types, each hook receives the {@link ModelEvent} of its action. Without strict types,
 * hooks receive the database `Event`.
 */
export type Lifecycles<TContentTypeUID extends UID.ContentType> = {
  [TAction in Action]?: IsStrict extends false
    ? (event: DatabaseEvent) => Promise<void> | void
    : (event: ModelEvent<TContentTypeUID, TAction>) => unknown;
};
