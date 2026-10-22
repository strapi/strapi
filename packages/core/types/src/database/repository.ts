import type { Internal } from '@strapi/database';

import type * as UID from '../uid';
import type { ID } from '../data';
import type * as Params from './params';
import type * as Result from './result';

/**
 * Typed query API for a single model, returned by `strapi.db.query(uid)`.
 *
 * TODO: Narrows `@strapi/database`'s `Repository` until the database types are moved to `@strapi/types`.
 */
export interface Repository<TSchemaUID extends UID.Schema = UID.Schema>
  extends Internal.Repository {
  findOne<const TParams extends Params.FindOne<TSchemaUID>>(
    params?: TParams
  ): Promise<Result.Entry<TSchemaUID, TParams> | null>;

  findMany<const TParams extends Params.FindMany<TSchemaUID>>(
    params?: TParams
  ): Promise<Result.Entry<TSchemaUID, TParams>[]>;

  findWithCount<const TParams extends Params.FindMany<TSchemaUID>>(
    params?: TParams
  ): Promise<[Result.Entry<TSchemaUID, TParams>[], number]>;

  findPage<const TParams extends Params.FindPage<TSchemaUID>>(
    params: TParams
  ): Promise<Result.PaginatedResult<TSchemaUID, TParams>>;

  create<const TParams extends Params.Create<TSchemaUID>>(
    params: TParams
  ): Promise<Result.Entry<TSchemaUID, TParams>>;

  createMany(params: Params.CreateMany<TSchemaUID>): Promise<Result.CreateManyResult>;

  update<const TParams extends Params.Update<TSchemaUID>>(
    params: TParams
  ): Promise<Result.Entry<TSchemaUID, TParams> | null>;

  updateMany(params: Params.UpdateMany<TSchemaUID>): Promise<Result.CountResult>;

  delete<const TParams extends Params.Delete<TSchemaUID>>(
    params: TParams
  ): Promise<Result.Entry<TSchemaUID, TParams> | null>;

  deleteMany(params?: Params.DeleteMany<TSchemaUID>): Promise<Result.CountResult>;

  count(params?: Params.Count<TSchemaUID>): Promise<number>;

  attachRelations(id: ID, data: Params.PartialData<TSchemaUID>): Promise<void>;

  updateRelations(id: ID, data: Params.PartialData<TSchemaUID>): Promise<void>;

  deleteRelations(id: ID): Promise<void>;

  populate<const TPopulate extends Params.Populate<TSchemaUID>>(
    entity: Result.EntryReference,
    populate: TPopulate
  ): Promise<Result.Entry<TSchemaUID, { populate: TPopulate }>>;

  /**
   * Loads a relational attribute of an entry.
   */
  load<const TAttributeName extends Params.PopulatableAttribute<TSchemaUID>>(
    entity: Result.EntryReference,
    field: TAttributeName,
    populate?: Params.Load<Params.PopulateTarget<TSchemaUID, TAttributeName>>
  ): Promise<Result.Load<TSchemaUID, TAttributeName>>;

  /**
   * Loads relational attributes of an entry, resolves to an object with the given fields.
   */
  load<const TAttributeName extends Params.PopulatableAttribute<TSchemaUID>>(
    entity: Result.EntryReference,
    field: readonly TAttributeName[],
    populate?: Params.Load<Params.PopulateTarget<TSchemaUID, TAttributeName>>
  ): Promise<Result.Load<TSchemaUID, readonly TAttributeName[]>>;

  load<const TAttributeName extends Params.PopulatableAttribute<TSchemaUID>>(
    entity: Result.EntryReference,
    field: TAttributeName | readonly TAttributeName[],
    populate?: Params.Load<Params.PopulateTarget<TSchemaUID, TAttributeName>>
  ): Promise<Result.Load<TSchemaUID, TAttributeName | readonly TAttributeName[]>>;

  /**
   * Only accepts a single `oneToMany` or `manyToMany` relation attribute.
   */
  loadPages<const TAttributeName extends Params.PopulatableAttribute<TSchemaUID>>(
    entity: Result.EntryReference,
    field: TAttributeName,
    populate?: Params.LoadPages<Params.PopulateTarget<TSchemaUID, TAttributeName>>
  ): Promise<Result.PaginatedResult<Params.PopulateTarget<TSchemaUID, TAttributeName>>>;
}
