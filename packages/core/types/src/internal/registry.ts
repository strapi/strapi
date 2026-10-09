import type * as Struct from '../struct';

import type * as UID from './uid';

/**
 * Extracts keys from a registry object based on a specified index type.
 *
 * @template TRegistry - The registry object.
 * @template TIndexType - The type of the index used to filter the keys.
 */
export type Keys<TRegistry extends object, TIndexType extends string> = Extract<
  keyof TRegistry,
  TIndexType
>;

/**
 * Generic content-type schemas, a copy of the unaugmented `Public.ContentTypeSchemas`. Strict mode
 * uses it while `Strapi.Registries.ContentTypeSchemas` is empty. An interface, not a mapped type:
 * lookups such as `Object.values` must resolve as they do without strict mode.
 */
export interface GenericContentTypeSchemas {
  [TKey: UID.ContentType]: Struct.ContentTypeSchema;
}

/**
 * Generic component schemas, a copy of the unaugmented `Public.ComponentSchemas`. Strict mode uses
 * it while `Strapi.Registries.ComponentSchemas` is empty.
 */
export interface GenericComponentSchemas {
  [TKey: UID.Component]: Struct.ComponentSchema;
}
