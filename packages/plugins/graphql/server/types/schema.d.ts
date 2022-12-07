import { ContentTypeKind, Schema } from '@strapi/strapi';

export interface ContentType extends Schema {
  globalId: string;
  uid: string;
  kind?: ContentTypeKind;
}
