import type * as Schema from '../../schema';

import type * as UID from '../../uid';
import type { MatchFirst, Guard } from '../../utils';

import type * as Params from './params';
import type { PartialEntity, Entity, Result, PaginatedResult } from './result';

export type UploadFile = (
  uid: UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

export * as Params from './params';
export * from './result';
export * from './plugin';

type WrapAction = Omit<keyof EntityService, 'wrapParams' | 'wrapResult' | 'emitEvent'>;

export interface EntityService {
  uploadFiles: UploadFile;

  wrapParams<
    TResult extends object = object,
    TContentTypeUID extends UID.ContentType = UID.ContentType,
    TParams extends object = object
  >(
    params?: TParams,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): Promise<TResult> | TResult;

  wrapResult<TResult = any, TContentTypeUID extends UID.ContentType = UID.ContentType>(
    result: unknown,
    options?: { uid: TContentTypeUID; action: WrapAction; [key: string]: unknown }
  ): Promise<TResult> | TResult;

  emitEvent<TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID,
    event: string,
    entity: Entity<TContentTypeUID>
  ): Promise<void>;
  // TODO: Split in 2 different signatures for both single types & collection types
  findMany<
    TContentTypeUID extends UID.ContentType,
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
  ): Promise<
    MatchFirst<
      [
        [UID.IsCollectionType<TContentTypeUID>, Result<TContentTypeUID, TParams>[]],
        [UID.IsSingleType<TContentTypeUID>, Result<TContentTypeUID, TParams> | null]
      ],
      (Result<TContentTypeUID, TParams> | null) | Result<TContentTypeUID, TParams>[]
    >
  >;

  findOne<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  delete<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  create<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams>>;

  update<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data:partial' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  findPage<
    TContentTypeUID extends UID.ContentType,
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
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'files' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    cloneId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated
   */
  deleteMany<TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID,
    params: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<{ count: number }>;

  /**
   * TODO: seems the same as findMany, it's not returning count by default
   * @deprecated
   */
  findWithRelationCounts<
    TContentTypeUID extends UID.ContentType,
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
  ): Promise<Result<TContentTypeUID, TParams>[]>;

  /**
   * @deprecated
   */
  findWithRelationCountsPage<
    TContentTypeUID extends UID.ContentType,
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

  count<TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<number>;

  /**
   * TODO: Considering making this API public include providing a valid return type
   * @internal
   */
  load<
    TContentTypeUID extends UID.ContentType,
    TField extends Schema.PopulatableAttributeNames<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<any>;

  /**
   * TODO: Considering making this API public include providing a valid return type
   * @internal
   */
  loadPages<
    TContentTypeUID extends UID.ContentType,
    TField extends Schema.PopulatableAttributeNames<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>,
    pagination?: Params.Pagination.Any
  ): Promise<any>;
}

type GetPopulatableFieldParams<
  TContentTypeUID extends UID.ContentType,
  TField extends Schema.PopulatableAttributeNames<TContentTypeUID>
> = MatchFirst<
  [
    [
      Schema.Attribute.HasTarget<Schema.AttributeByName<TContentTypeUID, TField>>,
      Params.Populate.NestedParams<
        Schema.Attribute.Target<Schema.AttributeByName<TContentTypeUID, TField>>
      >
    ],
    [
      Schema.Attribute.HasMorphTargets<Schema.AttributeByName<TContentTypeUID, TField>>,
      (
        | Params.Populate.Fragment<
            Schema.Attribute.MorphTargets<Schema.AttributeByName<TContentTypeUID, TField>>
          >
        | Params.Populate.NestedParams<UID.Schema>
      )
    ]
  ],
  Params.Populate.Fragment<UID.Schema> | Params.Populate.NestedParams<UID.Schema>
>;
