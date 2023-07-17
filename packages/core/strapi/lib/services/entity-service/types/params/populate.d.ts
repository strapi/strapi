import type { Attribute, Common, Utils } from '@strapi/strapi';

/**
 * Wildcard notation for populate
 *
 * To populate all the root level relations
 */
type WildcardNotation = '*';

/**
 * Union of all possible string representation for populate
 *
 * @example
 * type A = 'image'; // ✅
 * type B = 'image,component'; // ✅
 * type c = '*'; // ✅
 * type D = 'populatableField'; // ✅
 * type E = '<random_string>'; // ❌
 */
type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | WildcardNotation
  | Attribute.GetPopulatableKeys<TSchemaUID>
  | `${string},${string}`;

/**
 * Array notation for populate
 *
 * @example
 * type A = ['image']; // ✅
 * type B = ['image', 'component']; // ✅
 * type C = ['populatableField']; // ✅
 * type D = ['<random_string>']; // ❌
 */
type ArrayNotation<TSchemaUID extends Common.UID.Schema> =
  Attribute.GetPopulatableKeys<TSchemaUID>[];

export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>;
