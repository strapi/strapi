/**
 * Enumerates all possible attribute types in Strapi.
 *
 * These attribute types handle how data is stored and validated.
 *
 * Types range from primitive types like 'string', 'integer' and 'boolean' to more complex ones like 'media', 'relation', 'component', etc...
 *
 * @see Attribute
 * @see PopulatableKind
 * @see NonPopulatableKind
 */
export type Kind =
  | 'string'
  | 'text'
  | 'richtext'
  | 'email'
  | 'password'
  | 'date'
  | 'time'
  | 'datetime'
  | 'timestamp'
  | 'integer'
  | 'biginteger'
  | 'float'
  | 'decimal'
  | 'uid'
  | 'enumeration'
  | 'boolean'
  | 'json'
  | 'media'
  | 'relation'
  | 'component'
  | 'dynamiczone'
  | 'blocks';

/**
 * Most basic shape of a schema attribute
 *
 * @template TKind - The attribute type
 */
export interface Attribute<TKind extends Kind = Kind> {
  /**
   * Defines the type of the attribute.
   *
   * This refers to the {@link Kind} type where possible values range from simple primitives to more complex types.
   */
  type: TKind;

  /**
   * Specifies additional options used by plugins.
   *
   * This is an optional property that allows specifying extra configurations or settings, that
   * would be leveraged while processing or working with the attribute.
   *
   * Being an object, it can accept key-value pairs to define or customize plugin behavior.
   */
  pluginOptions?: object;

  /**
   * Indicates if the attribute is searchable.
   *
   * This is an optional Boolean property to enable or disable the search functionality for the attribute.
   *
   * Meaning that, if it's set to 'true', the attribute would be considered while performing a search operation.
   */
  searchable?: boolean;
}

/**
 * Creates a basic Attribute of type T
 *
 * It simplifies the construction of granular data types enabling the specification of exact attribute types.
 *
 * @template T - A type parameter extending {@link Kind} which dictates the attribute's type.
 *
 * @example
 * ```typescript
 * import type { Schema } from '@strapi/types';
 *
 * // An attribute of type 'boolean'
 * type BooleanAttribute = Schema.Attribute.OfType<'boolean'>;
 *
 * // 'boolean' attribute with additional options
 * type ConfigurableBooleanAttribute = Intersect<[Schema.Attribute.OfType<'boolean'>, ConfigurableOption]>;
 * ```
 *
 * @see Kind
 * @see Attribute
 */
export type OfType<T extends Kind> = Attribute<T>;
