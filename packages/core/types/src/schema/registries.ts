import type { IsStrict } from '../core/strictness';
import type * as Internal from '../internal';
import type * as Public from '../public';

/**
 * Generated content-type schemas in strict mode. Without generated entries, any content-type UID maps
 * to a generic schema, as without strict mode.
 */
type StrictContentTypeSchemas = [keyof Strapi.Registries.ContentTypeSchemas] extends [never]
  ? Internal.Registry.GenericContentTypeSchemas
  : Strapi.Registries.ContentTypeSchemas;

/**
 * Generated component schemas in strict mode. Without generated entries, any component UID maps
 * to a generic schema, as without strict mode.
 */
type StrictComponentSchemas = [keyof Strapi.Registries.ComponentSchemas] extends [never]
  ? Internal.Registry.GenericComponentSchemas
  : Strapi.Registries.ComponentSchemas;

/**
 * Content-type schemas keyed by UID: `Public.ContentTypeSchemas` without strict mode,
 * `Strapi.Registries.ContentTypeSchemas` with it. Strict mode ignores `Public` augmentations.
 */
export type ContentTypeSchemas = IsStrict extends false
  ? Public.ContentTypeSchemas
  : StrictContentTypeSchemas;

/**
 * Component schemas keyed by UID: `Public.ComponentSchemas` without strict mode,
 * `Strapi.Registries.ComponentSchemas` with it. Strict mode ignores `Public` augmentations.
 */
export type ComponentSchemas = IsStrict extends false
  ? Public.ComponentSchemas
  : StrictComponentSchemas;
