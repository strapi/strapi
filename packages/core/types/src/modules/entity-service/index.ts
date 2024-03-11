import type { Attribute, Common, Utils } from '../../types';
import type { PartialEntity, Result, PaginatedResult } from './result';
import type * as Params from './params';

export type UploadFile = (
  uid: Common.UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

export * as Params from './params';
export * from './result';
export * from './plugin';

type WrapAction = Omit<keyof EntityService, 'wrapParams' | 'wrapResult' | 'emitEvent'>;

/**
 * @deprecated will be removed in the next major version
 */
export interface EntityService {
  wrapParams<
    TResult extends object = object,
    TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType,
    TParams extends object = object
  >(
    params?: TParams,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): Promise<TResult> | TResult;

  /**
   * @deprecated will be removed in the next major version
   */
  wrapResult<
    TResult = any,
    TContentTypeUID extends Common.UID.ContentType = Common.UID.ContentType
  >(
    result: unknown,
    options?: { uid: TContentTypeUID; action: WrapAction; [key: string]: unknown }
  ): Promise<TResult> | TResult;

  findMany<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      'fields' | 'filters' | '_q' | 'pagination:offset' | 'sort' | 'populate' | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<
    Utils.Expression.MatchFirst<
      [
        [Common.UID.IsCollectionType<TContentTypeUID>, Result<TContentTypeUID, TParams>[]],
        [Common.UID.IsSingleType<TContentTypeUID>, Result<TContentTypeUID, TParams> | null]
      ],
      (Result<TContentTypeUID, TParams> | null) | Result<TContentTypeUID, TParams>[]
    >
  >;

  /**
   * @deprecated will be removed in the next major version
   */
  findOne<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated will be removed in the next major version
   */
  delete<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated will be removed in the next major version
   */
  create<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams>>;

  /**
   * @deprecated will be removed in the next major version
   */
  update<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data:partial' | 'fields' | 'populate'>
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated will be removed in the next major version
   */
  findPage<
    TContentTypeUID extends Common.UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      'fields' | 'populate' | 'pagination' | 'sort' | 'filters' | '_q' | 'plugin'
    >
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<PaginatedResult<TContentTypeUID, TParams>>;

  /**
   * @deprecated will be removed in the next major version
   */
  count<TContentTypeUID extends Common.UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<number>;

  /**
   * @deprecated
   * @internal
   */
  load<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<any>;

  /**
   * @deprecated
   * @internal
   */
  loadPages<
    TContentTypeUID extends Common.UID.ContentType,
    TField extends Attribute.GetPopulatableKeys<TContentTypeUID>
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>,
    pagination?: Params.Pagination.Any
  ): Promise<any>;
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
