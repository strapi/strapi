import type { Strapi as StrapiInterface } from './types/core';
import type { CollectionTypeSchema, SingleTypeSchema, ComponentSchema, ContentTypeSchema } from './types/core/schemas';
import type { KeysBy } from './types/utils';

declare global {
  namespace Strapi {
    /**
     * Map of UID / schemas used as a schemas database for other types.
     * It must be extended by the user application or plugins.
     * 
     * @example
     * ```ts
     * declare global {
     *   namespace Strapi {
     *     interface Schemas {
     *       'xxx::xxx.uid: ContentTypeSchema | ComponentSchema;
     *     }
     *   }
     * }
     * ```
     */
    interface Schemas {}

    /**
     * Litteral union type of every content type registered in Strapi.Schemas
     */
    type ContentTypeUIDs = KeysBy<Schemas, ContentTypeSchema>;

    /**
     * Litteral union type of every collection type registered in Strapi.Schemas
     */
    type CollectionTypeUIDs = KeysBy<Schemas, CollectionTypeSchema>;

    /**
     * Litteral union type of every single type registered in Strapi.Schemas
     */
    type SingleTypeUIDs = KeysBy<Schemas, SingleTypeSchema>;

    /**
     * Litteral union type of every component registered in Strapi.Schemas
     */
     type ComponentUIDs = KeysBy<Schemas, ComponentSchema>;

     /**
      * Global shorthand to access the `StrapiInterface` type
      */
     type Strapi = StrapiInterface;
  }

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
