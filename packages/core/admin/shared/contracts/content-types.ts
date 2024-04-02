import type { Struct } from '@strapi/types';

export interface ContentType extends Struct.ContentTypeSchema {
  isDisplayed: boolean;
  apiID: string;
}
