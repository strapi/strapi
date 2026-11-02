import type { Data as StrapiData, UID } from '@strapi/types';
import type { ID } from './relations/utils/types';

export type Data = {
  id?: ID | object;
  documentId?: StrapiData.DocumentID | object;
  [key: string]: any;
};

export type Options = {
  uid: UID.Schema;
  locale?: string | null;
  status: 'draft' | 'published';
};
