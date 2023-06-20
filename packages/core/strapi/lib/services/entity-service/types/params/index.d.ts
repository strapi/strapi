import type { Common } from '@strapi/strapi';

import type * as Sort from './sort';
import type * as Pagination from './pagination';

export type For<TSchemaUID extends Common.UID.Schema> = {
  sort?: Sort.Any<TSchemaUID>;
  pagination?: Pagination.Any;
};

export type { Sort, Pagination };
