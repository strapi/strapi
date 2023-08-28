import type { Attribute, Common, Utils } from '@strapi/strapi';
import type { Entity, PaginatedResult } from './result';

import type * as Params from './params';

// TODO: Move params to @strapi/utils (related to convert-query-params)
export * as Params from './params';

export * from './result';
export * from './plugin';

type WrapAction = Omit<keyof EntityService, 'wrapParams' | 'wrapResult' | 'emitEvent'>;

export interface EntityService {
  wrapParams<
    TResult = unknown,
    TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
    TParams extends object = object
  >(
    params?: TParams,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): Promise<TResult> | TResult;

  wrapResult<
    TResult = unknown,
    TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
  >(
    result: unknown,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): Promise<TResult> | TResult;

  emitEvent<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    event: string,
    entity: Entity<TContentTypeUID, never>
  ): Promise<void>;
  // TODO: Split in 2 different signatures for both single types & collection types
  findMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'filters'
      | '_q'
      | 'pagination:offset'
      | 'sort'
      | 'populate'
      | 'publicationState'
      | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Utils.Expression.MatchFirst<
    [
      [Common.UID.IsCollectionType<TContentTypeUID>, Promise<Entity<TContentTypeUID, TParams>[]>],
      [Common.UID.IsSingleType<TContentTypeUID>, Promise<Entity<TContentTypeUID, TParams> | null>]
    ],
    Promise<(Entity<TContentTypeUID, TParams> | null) & Entity<TContentTypeUID, TParams>[]>
  >;

  findOne<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams> | null>;

  delete<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams> | null>;

  create<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams>>;

  update<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data:partial' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams> | null>;

  findPage<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'populate'
      | 'pagination'
      | 'sort'
      | 'filters'
      | '_q'
      | 'publicationState'
      | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<PaginatedResult<TContentTypeUID, TParams>>;

  clone<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    cloneId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated
   */
  deleteMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<{ count: number }>;

  /**
   * TODO: seems the same as findMany, it's not returning count by default
   * @deprecated
   */
  findWithRelationCounts<
    TContentTypeUID extends Common.UID.Schema,
    TParams extends Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'filters'
      | '_q'
      | 'pagination:offset'
      | 'sort'
      | 'populate'
      | 'publicationState'
      | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Entity<TContentTypeUID, TParams>[]>;

  /**
   * @deprecated
   */
  findWithRelationCountsPage<
    TContentTypeUID extends Common.UID.Schema,
    TParams extends Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'filters'
      | '_q'
      | 'pagination'
      | 'sort'
      | 'populate'
      | 'publicationState'
      | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<PaginatedResult<TContentTypeUID, TParams>>;

  count<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<number>;

  load<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: Entity<TContentTypeUID, never>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<Entity<TContentTypeUID, never> | Entity<TContentTypeUID, never>[]>;

  loadPages<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: Entity<TContentTypeUID, never>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>,
    pagination?: Params.Pagination.Any
  ): Promise<PaginatedResult<TContentTypeUID, never>>;
}

type GetPopulatableFieldParams<
  TContentTypeUID extends Common.UID.ContentType,
  TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
> = Utils.Expression.MatchFirst<
  [
    [
      Attribute.HasTarget<TContentTypeUID, TField>,
      Params.Populate.NestedParams<Attribute.GetTarget<TContentTypeUID, TField>>
    ],
    [
      Attribute.HasMorphTargets<TContentTypeUID, TField>,
      (
        | Params.Populate.Fragment<Attribute.GetMorphTargets<TContentTypeUID, TField>>
        | Params.Populate.NestedParams<Common.UID.Schema>
      )
    ]
  ],
  Params.Populate.Fragment<Common.UID.Schema> | Params.Populate.NestedParams<Common.UID.Schema>
>;
