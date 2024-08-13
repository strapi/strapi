import type { Data } from '@strapi/types';

import type { SortKey, SortOrder } from '../../shared/contracts/folders';

export type Query = {
  _q?: string;
  folderPath?: string;
  folder?: Data.ID;
  page?: string;
  pageSize?: string;
  sort?: `${SortKey}:${SortOrder}`;
};
