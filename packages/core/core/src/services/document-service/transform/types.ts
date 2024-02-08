import { Common } from '@strapi/types';
import { type ID } from './relations/utils/types';

export type Data = {
  id?: ID | object;
  documentId?: ID | object;
  [key: string]: any;
};

export type Options = {
  uid: Common.UID.Schema;
  locale?: string | null;
  isDraft: boolean;
};
