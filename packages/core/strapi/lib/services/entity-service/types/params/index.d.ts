import type { Common } from '@strapi/strapi';

import type * as Sort from './sort';
import type * as Pagination from './pagination';
import type * as Fields from './fields';
import type * as Filters from './filters';
import type * as Populate from './populate';
import type * as PublicationState from './publication-state';
import type * as Data from './data';

import type * as Attribute from './attributes';

export type For<TSchemaUID extends Common.UID.Schema> = {
  sort?: Sort.Any<TSchemaUID>;
  fields?: Fields.Any<TSchemaUID>;
  filters?: Filters.Any<TSchemaUID>;
  populate?: Populate.Any<TSchemaUID>;
  data?: Data.Input<TSchemaUID>;
} & Pagination.Any &
  PublicationState.For<TSchemaUID>;

export type { Sort, Pagination, Fields, Filters, PublicationState, Data, Attribute };
