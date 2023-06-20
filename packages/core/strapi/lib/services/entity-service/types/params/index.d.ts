import type { Common } from '@strapi/strapi';

import type * as Sort from './sort';

export type For<TSchemaUID extends Common.UID.Schema> = {
  sort: Sort.Any<TSchemaUID>;
};

export type { Sort };
