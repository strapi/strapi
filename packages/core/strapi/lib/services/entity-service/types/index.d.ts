import type { Attribute, Common, Utils } from '@strapi/strapi';
import type { Result, PaginatedResult } from './result';

import type * as Params from './params';

// TODO: Move params to @strapi/utils (related to convert-query-params)
export * as Params from './params';

export * from './result';
export * from './plugin';

type WrapAction = Omit<keyof EntityService, 'wrapParams' | 'wrapResult' | 'emitEvent'>;

export interface EntityService {
  wrapParams<TContentTypeUID extends Common.UID.ContentType, TParams extends object>(
    params?: TParams,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): unknown;

  wrapResult<TContentTypeUID extends Common.UID.ContentType>(
    result: any,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): any;

  emitEvent<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    event: Event,
    entity: Attribute.GetValues<TContentTypeUID> // double check
  ): Promise<void>;

  findMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'filters'
      | 'pagination:offset'
      | 'sort'
      | 'populate'
      | 'publicationState'
      | 'plugin'
    >
  ): Promise<Result<TContentTypeUID>[]>;

  findOne<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    entityId: number,
    params?: Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  ): Promise<Result<TContentTypeUID> | null>;

  delete<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    entityId: number,
    params?: Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  ): Promise<Result<TContentTypeUID> | null>;

  create<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  ): Promise<Result<TContentTypeUID>>;

  update<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    entityId: number,
    params?: Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  ): Promise<Result<TContentTypeUID>>;

  findPage<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<
      TContentTypeUID,
      'fields' | 'filters' | 'pagination' | 'sort' | 'populate' | 'publicationState' | 'plugin'
    >
  ): Promise<PaginatedResult<TContentTypeUID>>;

  clone<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    cloneId: number,
    params?: Params.Pick<TContentTypeUID, 'fields' | 'populate' | 'data' | 'files'>
  ): Promise<Result<TContentTypeUID> | null>;

  deleteMany<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params: Params.Pick<TContentTypeUID, 'filters' | 'populate'>
  ): Promise<{ count: number }>;

  // TODO: What difference with findMany?? Not returning count by default
  findWithRelationCounts<TContentTypeUID extends Common.UID.Schema>(
    uid: TContentTypeUID,
    params?: Params.Pick<
      TContentTypeUID,
      | 'fields'
      | 'populate'
      | 'sort'
      | 'filters'
      | 'plugin'
      | 'pagination:offset'
      | 'publicationState'
    >
  ): Promise<Result<TContentTypeUID>[]>;

  findWithRelationCountsPage<TContentTypeUID extends Common.UID.Schema>(
    uid: TContentTypeUID,
    params?: Params.Pick<
      TContentTypeUID,
      'fields' | 'populate' | 'sort' | 'filters' | 'plugin' | 'pagination' | 'publicationState'
    >
  ): PaginatedResult<TContentTypeUID>;

  count<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<
      TContentTypeUID,
      'fields' | 'populate' | 'sort' | 'filters' | 'plugin' | 'pagination' | 'publicationState'
    >
  ): Promise<number>;

  load<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: Attribute.GetValues<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<Result<TContentTypeUID>>;

  loadPages<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: Attribute.GetValues<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<PaginatedResult<TContentTypeUID>>;
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
