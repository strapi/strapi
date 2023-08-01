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
  | 'dynamiczone';

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
