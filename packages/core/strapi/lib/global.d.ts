import type { Strapi as StrapiInterface } from './types/core';
import type { CollectionTypeSchema, SingleTypeSchema, ComponentSchema, ContentTypeSchema } from './types/core/schemas';
import type { KeysBy } from './types/utils';

declare global {
  /**
   * Strapi global variable definition
   **/
  export const strapi: StrapiInterface;

  /**
   * Adds the strapi global variable to the NodeJS Global interface
   */
  export interface Global {
    strapi: StrapiInterface;
  }
}
