import { UID, Utils, Schema } from '../..';
import type * as Params from './params';

import type { PartialEntity, Result, PaginatedResult } from './result';

export type UploadFile = (
  uid: UID.Schema,
  entity: Record<string, unknown>,
  files: Record<string, unknown>
) => Promise<void>;

export * as Params from './params';
export * from './result';
export * from './plugin';

type WrapAction = Omit<keyof EntityService, 'wrapParams' | 'wrapResult' | 'emitEvent'>;

/**
 * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
 * @see {@link https://docs.strapi.io/dev-docs/api/document-service} Document Service API
 */
export interface EntityService {
  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  wrapParams<
    TResult extends object = object,
    TContentTypeUID extends UID.ContentType = UID.ContentType,
    TParams extends object = object,
  >(
    params?: TParams,
    options?: { uid: TContentTypeUID; action: WrapAction }
  ): Promise<TResult> | TResult;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  wrapResult<TResult = any, TContentTypeUID extends UID.ContentType = UID.ContentType>(
    result: unknown,
    options?: { uid: TContentTypeUID; action: WrapAction; [key: string]: unknown }
  ): Promise<TResult> | TResult;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  findMany<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      'fields' | 'filters' | '_q' | 'pagination:offset' | 'sort' | 'populate' | 'plugin'
    >,
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<
    Utils.MatchFirst<
      [
        [UID.IsCollectionType<TContentTypeUID>, Result<TContentTypeUID, TParams>[]],
        [UID.IsSingleType<TContentTypeUID>, Result<TContentTypeUID, TParams> | null],
      ],
      (Result<TContentTypeUID, TParams> | null) | Result<TContentTypeUID, TParams>[]
    >
  >;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  findOne<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>,
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  delete<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'fields' | 'populate'>,
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  create<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data' | 'fields' | 'populate'>,
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams>>;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  update<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<TContentTypeUID, 'data:partial' | 'fields' | 'populate'>,
  >(
    uid: TContentTypeUID,
    entityId: Params.Attribute.ID,
    params?: TParams
  ): Promise<Result<TContentTypeUID, TParams> | null>;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  findPage<
    TContentTypeUID extends UID.ContentType,
    TParams extends Params.Pick<
      TContentTypeUID,
      'fields' | 'populate' | 'pagination' | 'sort' | 'filters' | '_q' | 'plugin'
    >,
  >(
    uid: TContentTypeUID,
    params?: TParams
  ): Promise<PaginatedResult<TContentTypeUID, TParams>>;

  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  count<TContentTypeUID extends UID.ContentType>(
    uid: TContentTypeUID,
    params?: Params.Pick<TContentTypeUID, 'filters' | '_q'>
  ): Promise<number>;

  /**
   * @deprecated Will be removed in the next major version.
   * @internal
   */
  load<
    TContentTypeUID extends UID.ContentType,
    TField extends Schema.PopulatableAttributeNames<TContentTypeUID>,
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>
  ): Promise<any>;

  /**
   * @deprecated Will be removed in the next major version.
   * @internal
   */
  loadPages<
    TContentTypeUID extends UID.ContentType,
    TField extends Schema.PopulatableAttributeNames<TContentTypeUID>,
  >(
    uid: TContentTypeUID,
    entity: PartialEntity<TContentTypeUID>,
    field: Utils.Guard.Never<TField, string>,
    params?: GetPopulatableFieldParams<TContentTypeUID, TField>,
    pagination?: Params.Pagination.Any
  ): Promise<any>;
}

type GetPopulatableFieldParams<
  TContentTypeUID extends UID.ContentType,
  TField extends Schema.PopulatableAttributeNames<TContentTypeUID>,
> = Utils.MatchFirst<
  [
    [
      Schema.Attribute.HasTarget<Schema.AttributeByName<TContentTypeUID, TField>>,
      Params.Populate.NestedParams<
        Schema.Attribute.Target<Schema.AttributeByName<TContentTypeUID, TField>>
      >,
    ],
    [
      Schema.Attribute.HasMorphTargets<Schema.AttributeByName<TContentTypeUID, TField>>,
      (
        | Params.Populate.Fragment<
            Schema.Attribute.MorphTargets<Schema.AttributeByName<TContentTypeUID, TField>>
          >
        | Params.Populate.NestedParams<UID.Schema>
      ),
    ],
  ],
  Params.Populate.Fragment<UID.Schema> | Params.Populate.NestedParams<UID.Schema>
>;
