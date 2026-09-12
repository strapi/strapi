import type * as UID from '../../../uid';
import { Extends, MatchAllIntersect, Object } from '../../../utils';

import type { GetPluginParams } from '..';

// Params
import type * as Sort from './sort';
import type * as Pagination from './pagination';
import type * as Fields from './fields';
import type * as Filters from './filters';
import type * as Populate from './populate';
import type * as PublicationStatus from './status';
import type * as Data from './data';
import type * as Search from './search';
import type * as Locale from './locale';

// Utils
import type * as Attribute from './attributes';

/**
 * @remark
 * Every optional param below explicitly allows `undefined` so that callers compiling with
 * `exactOptionalPropertyTypes` can forward their own optional values (`{ populate: maybePopulate }`)
 * without having to conditionally spread each key. This is a no-op when the flag is off.
 */
export type Pick<TSchemaUID extends UID.Schema, TKind extends Kind> = MatchAllIntersect<
  [
    // Sort
    [HasMember<TKind, 'sort'>, { sort?: Sort.Any<TSchemaUID> | undefined }],
    [HasMember<TKind, 'sort:string'>, { sort?: Sort.StringNotation<TSchemaUID> | undefined }],
    [HasMember<TKind, 'sort:array'>, { sort?: Sort.ArrayNotation<TSchemaUID> | undefined }],
    [HasMember<TKind, 'sort:object'>, { sort?: Sort.ObjectNotation<TSchemaUID> | undefined }],
    // Fields
    [HasMember<TKind, 'fields'>, { fields?: Fields.Any<TSchemaUID> | undefined }],
    [HasMember<TKind, 'fields:string'>, { fields?: Fields.StringNotation<TSchemaUID> | undefined }],
    [HasMember<TKind, 'fields:array'>, { fields?: Fields.ArrayNotation<TSchemaUID> | undefined }],
    // Filters
    [HasMember<TKind, 'filters'>, { filters?: Filters.Any<TSchemaUID> | undefined }],
    // Populate
    [HasMember<TKind, 'populate'>, { populate?: Populate.Any<TSchemaUID> | undefined }],
    [
      HasMember<TKind, 'populate:string'>,
      { populate?: Populate.StringNotation<TSchemaUID> | undefined },
    ],
    [
      HasMember<TKind, 'populate:array'>,
      { populate?: Populate.ArrayNotation<TSchemaUID> | undefined },
    ],
    [
      HasMember<TKind, 'populate:object'>,
      { populate?: Populate.ObjectNotation<TSchemaUID> | undefined },
    ],
    // Pagination
    [HasMember<TKind, 'pagination'>, Pagination.Any],
    [HasMember<TKind, 'pagination:offset'>, Pagination.OffsetNotation],
    [HasMember<TKind, 'pagination:page'>, Pagination.PageNotation],
    // Publication Status
    [HasMember<TKind, 'status'>, PublicationStatus.Param],
    // Deprecated param; prefer `publicationFilter` via PublicationFilterParam.
    [HasMember<TKind, 'hasPublishedVersion'>, PublicationStatus.Param],
    [HasMember<TKind, 'publicationFilter'>, PublicationStatus.PublicationFilterParam],
    // Locale
    [HasMember<TKind, 'locale'>, { locale?: Locale.Any | undefined }],
    [HasMember<TKind, 'locale:string'>, { locale?: Locale.StringNotation | undefined }],
    [HasMember<TKind, 'locale:array'>, { locale?: Locale.ArrayNotation | undefined }],
    // Plugin
    [HasMember<TKind, 'plugin'>, GetPluginParams<TSchemaUID>],
    // Data
    [HasMember<TKind, 'data'>, { data?: Data.Input<TSchemaUID> | undefined }],
    [
      HasMember<TKind, 'data:partial'>,
      { data?: Object.PartialWithUndefined<Data.Input<TSchemaUID>> | undefined },
    ],
    // Search
    [HasMember<TKind, '_q'>, { _q?: Search.Q | undefined }],
    // Look Up - For internal use only
    [HasMember<TKind, 'lookup'>, { lookup?: Record<string, unknown> | undefined }],
  ]
>;

export type Kind =
  | 'sort'
  | 'sort:string'
  | 'sort:array'
  | 'sort:object'
  | 'fields'
  | 'fields:string'
  | 'fields:array'
  | 'filters'
  | 'populate'
  | 'populate:string'
  | 'populate:array'
  | 'populate:object'
  | 'pagination'
  | 'pagination:offset'
  | 'pagination:page'
  | 'status'
  | 'hasPublishedVersion' // deprecated; use `publicationFilter`
  | 'publicationFilter'
  | 'locale'
  | 'locale:string'
  | 'locale:array'
  | 'plugin'
  | 'data'
  | 'data:partial'
  | '_q'
  | 'lookup';

type HasMember<TValue extends Kind, TTest extends Kind> = Extends<TTest, TValue>;

export type All = Pick<UID.Schema, Kind>;

export type {
  Sort,
  Pagination,
  Fields,
  Filters,
  Populate,
  Data,
  Attribute,
  PublicationStatus,
  Locale,
};
