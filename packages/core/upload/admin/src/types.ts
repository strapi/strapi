import type { Data } from '@strapi/types';

import type { SortKey, SortOrder } from '../../shared/contracts/folders';

export type Query = {
  _q?: string;
  folderPath?: string;
  folder?:
    | Data.ID
    | {
        id: Data.ID;
      };
  page?:
    | string
    | number
    | {
        id: string | number;
      };
  pageSize?: string | number;
  sort?: `${SortKey}:${SortOrder}`;
  filters?: Record<string, unknown>;
};
