import type { Attribute, Common } from '@strapi/strapi';

export module OrderKind {
  export type Asc = 'asc';
  export type Desc = 'desc';

  export type Any = Asc | Desc;
}

// String

/**
 * Single non-populatable attribute representation
 *
 * @example
 * type A = 'title'; // ✅
 * type B = 'description'; // ✅
 * type C = 'title:asc'; // ❌
 * type D = 'title,description'; // ❌
 */
type SingleAttribute<TSchemaUID extends Common.UID.Schema> =
  Attribute.GetNonPopulatableKeys<TSchemaUID>;

/**
 * Ordered single non-populatable attribute representation
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ❌
 * type D = 'title,description'; // ❌
 */
type OrderedSingleAttribute<TSchemaUID extends Common.UID.Schema> =
  `${SingleAttribute<TSchemaUID>}:${OrderKind.Any}`;

/**
 * Union of all possible string representation for a sort
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ✅
 * type D = 'title,description:asc'; // ✅
 * type E = [42]; // ❌
 * type F = { title: 'asc' }; // ❌
 */
export type StringNotation<TSchemaUID extends Common.UID.Schema> =
  | SingleAttribute<TSchemaUID>
  | OrderedSingleAttribute<TSchemaUID>
  // TODO: Improve type checking for comma separated strings
  // Loose checking for comma separated literal sort (complex to typecheck as the combination are near infinite)
  | `${string},${string}`;

// Array

/**
 * Array notation for a sort
 *
 * @example
 * type A = ['title:asc', 'description']; // ✅
 * type B = ['title']; // ✅
 * type C = ['count', 'title,description:asc']; // ✅
 * type D = { title: 'asc' }; // ❌
 * type E = [42]; // ❌
 * type F = 'title'; // ❌
 */
export type ArrayNotation<TSchemaUID extends Common.UID.Schema> = StringNotation<TSchemaUID>[];

// Objects

/**
 * Object notation for a sort
 *
 * @example
 * type A = { title: 'asc' }; // ✅
 * type B = { title: 'asc', description: 'desc' }; // ✅
 * type C = { title: 'asc', author: { name: 'asc' } }; // ✅
 * type D = { author: { email: 'asc', role: { name: 'desc' } } }; // ✅
 * type E = ['title']; // ❌
 * type F = 'title'; // ❌
 */
export type ObjectNotation<TSchemaUID extends Common.UID.Schema> = {
  // First level sort
  [key in Attribute.GetNonPopulatableKeys<TSchemaUID>]?: OrderKind.Any;
} & {
  // Deep sort, only add populatable keys that have a
  // target (remove dynamic zones and other polymorphic links)
  [key in Attribute.GetKeysWithTarget<TSchemaUID>]?: ObjectNotation<
    Attribute.GetTarget<TSchemaUID, key>
  >;
};

/**
 * Represents any notation for a sort (string, array, object)
 *
 * @example
 * type A = 'title:asc'; // ✅
 * type B = 'description:desc'; // ✅
 * type C = 'title'; // ✅
 * type D = 'title,description:asc'; // ✅
 * type E = ['title:asc', 'description']; // ✅
 * type F = ['title']; // ✅
 * type G = ['count', 'title,description:asc']; // ✅
 * type H = { title: 'asc' }; // ✅
 * type I = { title: 'asc', description: 'desc' }; // ✅
 * type J = { title: 'asc', author: { name: 'asc' } }; // ✅
 * type K = { author: { email: 'asc', role: { name: 'desc' } } }; // ✅
 */
export type Any<TSchemaUID extends Common.UID.Schema> =
  | StringNotation<TSchemaUID>
  | ArrayNotation<TSchemaUID>
  | ObjectNotation<TSchemaUID>;
