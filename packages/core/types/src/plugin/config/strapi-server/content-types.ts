import type { Struct } from '../../../internal';

export interface ContentTypes {
  /**
   * Only the schema property is used and available
   * See loader in packages/core/strapi/src/core/loaders/plugins/index.ts
   *  */
  [key: string]: { schema: Struct.SchemaDefinition };
}
