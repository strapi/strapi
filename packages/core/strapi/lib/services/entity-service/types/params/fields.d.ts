import type { Attribute, Common, Utils } from '@strapi/strapi';

/**
 * Wildcard notation for the fields.
 *
 * When used, it represents every non-populatable field from the given schema
 */
export type WildcardNotation = '*';

/**
 * Single non-populatable attribute representation
 *
 * @example
 * type A = 'title'; // ✅
 * type B = 'description'; // ✅
 * type C = 'populatableField'; // ❌
 * type D = '<random_string>'; // ❌
 */
export type SingleAttribute<TSchemaUID extends Common.UID.Schema> =
  | 'id'
  | Utils.Guard.Never<Attribute.GetNonPopulatableKeys<TSchemaUID>, string>;

/**
 * Union of all possible string representation for fields
 *
 * @example
 * type A = 'title'; // ✅
 * type B = 'title,description'; // ✅
 * type C = 'id'; // ✅
 * type D = '*'; // ✅
 * type E = 'populatableField'; // ❌
 * type F = '<random_string>'; // ❌
 */
export type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | WildcardNotation
  | SingleAttribute<TSchemaUID>
  // TODO: Loose type checking to avoid circular dependencies & infinite recursion
  | `${string},${string}`;

/**
 * Array notation for fields
 *
 * @example
 * type A = ['title']; // ✅
 * type B = ['title', 'description']; // ✅
 * type C = ['id']; // ✅
 * type E = ['*']; // ❌
 * type F = ['populatableField']; // ❌
 * type G = ['<random_string>']; // ❌
 */
export type ArrayNotation<TSchemaUID extends Common.UID.Schema> = Exclude<
  StringNotation<TSchemaUID>,
  WildcardNotation
>[];

/**
 * Represents any notation for a sort (string, array, object)
 *
 * @example
 * type A = '*'; // ✅
 * type B = 'id'; // ✅
 * type C = 'title'; // ✅
 * type D = 'title,description'; // ✅
 * type E = ['title', 'description']; // ✅
 * type F = [id, 'title,description']; // ✅
 * type G = ['*']; // ❌
 * type H = ['populatableField']; // ❌
 * type I = ['<random_string>']; // ❌
 * type J = 'populatableField'; // ❌
 * type K = '<random_string>'; // ❌
 */
export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>;
