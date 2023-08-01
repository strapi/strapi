import type { Common, EntityService } from '@strapi/strapi';
// Params
import type * as Sort from './sort';
import type * as Pagination from './pagination';
import type * as Fields from './fields';
import type * as Filters from './filters';
import type * as Populate from './populate';
import type * as PublicationState from './publication-state';
import type * as Data from './data';
// Utils
import type * as Attribute from './attributes';

type Read<TSchemaUID extends Common.UID.Schema> = {
  sort?: Sort.Any<TSchemaUID>;
  fields?: Fields.Any<TSchemaUID>;
  filters?: Filters.Any<TSchemaUID>;
  populate?: Populate.Any<TSchemaUID>;
} & Pagination.Any &
  PublicationState.For<TSchemaUID> &
  EntityService.GetPluginReadParams<TSchemaUID>;

type Write<TSchemaUID extends Common.UID.Schema> = {
  data?: Data.Input<TSchemaUID>;
  files?: unknown; // TODO
} & EntityService.GetPluginWriteParams<TSchemaUID>;

type ReadWrite<TSchemaUID extends Common.UID.Schema> = Read<TSchemaUID> & Write<TSchemaUID>;

export type {
  // main exports
  Read,
  Write,
  ReadWrite,
  // re-exports
  Pagination,
  Fields,
  Filters,
  PublicationState,
  Data,
  Attribute,
};
