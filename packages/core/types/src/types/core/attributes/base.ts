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
  useJoinTable?: boolean;

  /**
   * Database validations and settings
   * https://docs-v4.strapi.io/dev-docs/backend-customization/models#database-validations-and-settings
   * @experimental
   * @deprecated The column property is experimental and can be deprecated/changed at any time in the future.
   */
  column?: Partial<Column>;
}

// NOTE: Copied directly from @strapi/database package
export interface Column {
  type: string;
  name: string;
  args: unknown[];
  defaultTo: unknown;
  notNullable: boolean;
  unsigned: boolean;
  unique: boolean;
  primary: boolean;
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

export interface WritableOption {
  writable?: boolean;
}

export interface VisibleOption {
  visible?: boolean;
}
