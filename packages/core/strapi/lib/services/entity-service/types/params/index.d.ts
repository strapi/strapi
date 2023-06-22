import type { Common } from '@strapi/strapi';

import type * as Sort from './sort';
import type * as Pagination from './pagination';
import type * as Fields from './fields';

export type For<TSchemaUID extends Common.UID.Schema> = {
  sort?: Sort.Any<TSchemaUID>;
  fields?: Fields.Any<TSchemaUID>;
} & Pagination.Any;

export type { Sort, Pagination, Fields };
