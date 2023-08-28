import type { Common, EntityService, Utils } from '@strapi/strapi';
// Params
import type * as Sort from './sort';
import type * as Pagination from './pagination';
import type * as Fields from './fields';
import type * as Filters from './filters';
import type * as Populate from './populate';
import type * as PublicationState from './publication-state';
import type * as Data from './data';
import type * as Search from './search';

// Utils
import type * as Attribute from './attributes';

export type Pick<
  TSchemaUID extends Common.UID.Schema,
  TKind extends Kind
> = Utils.Expression.MatchAllIntersect<
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
    // Publication State
    [HasMember<TKind, 'publicationState'>, PublicationState.For<TSchemaUID>],
    // Plugin
    [HasMember<TKind, 'plugin'>, EntityService.GetPluginParams<TSchemaUID>],
    // Data
    [HasMember<TKind, 'data'>, { data?: Data.Input<TSchemaUID> }],
    [HasMember<TKind, 'data:partial'>, { data?: Partial<Data.Input<TSchemaUID>> }],
    // Files
    [HasMember<TKind, 'files'>, { files?: unknown }], // TODO
    // Search
    [HasMember<TKind, '_q'>, { _q?: Search.Q }]
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
  | 'publicationState'
  | 'plugin'
  | 'data'
  | 'data:partial'
  | 'files'
  | '_q';

type HasMember<TValue extends Kind, TTest extends Kind> = Utils.Expression.Extends<TTest, TValue>;

export type { Sort, Pagination, Fields, Filters, Populate, PublicationState, Data, Attribute };
