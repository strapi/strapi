import { GetAttributeValue } from './utils';

/**
 * List of all the Strapi attribute types
 */
export type AttributeType =
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
  | 'dynamiczone';

/**
 * Most basic shape of a schema attribute
 */
export interface Attribute<T extends AttributeType = AttributeType> {
  /**
   * Type of the attribute
   */
  type: T;

  /**
   * Options defined and used by the plugins
   */
  pluginOptions?: object;
}

// Common attributes Options

export interface RequiredOption {
  required?: boolean;
}

export interface PrivateOption {
  private?: boolean;
}

export interface UniqueOption {
  unique?: boolean;
}

export interface DefaultOption<T> {
  default?: T;
}

export interface ConfigurableOption {
  configurable?: boolean;
}

export interface MinMaxOption<T = number> {
  min?: T;
  max?: T;
}

export interface MinMaxLengthOption {
  minLength?: number;
  maxLength?: number;
}

export interface AttributePluginOption {
  pluginOptions?: object;
}
