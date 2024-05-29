import type * as UID from '../../../uid';
import { Extends, MatchAllIntersect } from '../../../utils';

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

export type Pick<TSchemaUID extends UID.Schema, TKind extends Kind> = MatchAllIntersect<
  [
    // Sort
    [HasMember<TKind, 'sort'>, { sort?: Sort.Any<TSchemaUID> }],
    [HasMember<TKind, 'sort:string'>, { sort?: Sort.StringNotation<TSchemaUID> }],
    [HasMember<TKind, 'sort:array'>, { sort?: Sort.ArrayNotation<TSchemaUID> }],
    [HasMember<TKind, 'sort:object'>, { sort?: Sort.ObjectNotation<TSchemaUID> }],
    // Fields
    [HasMember<TKind, 'fields'>, { fields?: Fields.Any<TSchemaUID> }],
    [HasMember<TKind, 'fields:string'>, { fields?: Fields.StringNotation<TSchemaUID> }],
    [HasMember<TKind, 'fields:array'>, { fields?: Fields.ArrayNotation<TSchemaUID> }],
    // Filters
    [HasMember<TKind, 'filters'>, { filters?: Filters.Any<TSchemaUID> }],
    // Populate
    [HasMember<TKind, 'populate'>, { populate?: Populate.Any<TSchemaUID> }],
    [HasMember<TKind, 'populate:string'>, { populate?: Populate.StringNotation<TSchemaUID> }],
    [HasMember<TKind, 'populate:array'>, { populate?: Populate.ArrayNotation<TSchemaUID> }],
    [HasMember<TKind, 'populate:object'>, { populate?: Populate.ObjectNotation<TSchemaUID> }],
    // Pagination
    [HasMember<TKind, 'pagination'>, Pagination.Any],
    [HasMember<TKind, 'pagination:offset'>, Pagination.OffsetNotation],
    [HasMember<TKind, 'pagination:page'>, Pagination.PageNotation],
    // Publication Status
    [HasMember<TKind, 'status'>, PublicationStatus.Param],
    // Locale
    [HasMember<TKind, 'locale'>, { locale?: Locale.Any }],
    [HasMember<TKind, 'locale:string'>, { locale?: Locale.StringNotation }],
    [HasMember<TKind, 'locale:array'>, { locale?: Locale.ArrayNotation }],
    // Plugin
    [HasMember<TKind, 'plugin'>, GetPluginParams<TSchemaUID>],
    // Data
    [HasMember<TKind, 'data'>, { data?: Data.Input<TSchemaUID> }],
    [HasMember<TKind, 'data:partial'>, { data?: Partial<Data.Input<TSchemaUID>> }],
    // Search
    [HasMember<TKind, '_q'>, { _q?: Search.Q }],
    // Look Up - For internal use only
    [HasMember<TKind, 'lookup'>, { lookup?: Record<string, unknown> }],
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
