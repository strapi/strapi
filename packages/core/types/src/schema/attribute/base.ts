/**
 * List of all the Strapi attribute types
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
 */
export interface Attribute<TKind extends Kind = Kind> {
  /**
   * Type of the attribute
   */
  type: TKind;

  /**
   * Options defined and used by the plugins
   */
  pluginOptions?: object;
}

/**
 * Creates a basic Attribute of type T
 */
export type OfType<T extends Kind> = Attribute<T>;
