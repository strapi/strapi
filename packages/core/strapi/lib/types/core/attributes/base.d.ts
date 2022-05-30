/**
 * List of all the Strapi attribute types
 */
export type Type =
  | 'string'
  | 'text'
  | 'richtext'
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
  | 'dynamiczone';

/**
 * Most basic shape of a schema attribute
 */
export interface Attribute<T extends Type = Type> {
  /**
   * Type of the attribute
   */
  type: T;

  /**
   * Whether the attribute is optional or not
   */
  required?: boolean;

  /**
   * Whether the attribute will be omitted from the content-api response or not
   */
  private?: boolean;

  /**
   * Options defined and used by the plugins
   */
  pluginOptions?: AttributePluginOptions;
}

export type AttributePluginOptions = {};
