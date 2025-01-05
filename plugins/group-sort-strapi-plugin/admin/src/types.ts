import { Attribute } from '@strapi/types/dist/schema';

export interface ItemsDictionary
  extends Record<
    string,
    any & {
      documentId: string;
      thumbnailUrisByMediaFields: Record<string, string>;
      titlesByTitleFields: Record<string, string>;
    }
  > {}


export type OrderAttribute = Attribute.AnyAttribute & {
  order: '1d' | '2d' | 'multiline';
}
