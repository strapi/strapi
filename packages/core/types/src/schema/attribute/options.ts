/**
 * Interfaces and types designed for managing attribute options.
 *
 * It includes (but is not limited to) settings for requirements, privacy, uniqueness, default values, configurability,
 * constraints, visibility, and writability of an attribute as well as the provision for custom fields.
 */

/**
 * Specifies whether an attribute is required to be filled.
 *
 * If not defined, it defaults to false.
 */
export interface RequiredOption {
  required?: boolean;
}

/**
 * Specifies whether an attribute is private and should be included in the content API entries.
 *
 * If not defined, it defaults to false.
 */
export interface PrivateOption {
  private?: boolean;
}

/**
 * Specifies whether an attribute must have unique values for each entry.
 *
 * If not defined, it defaults to false.
 */
export interface UniqueOption {
  unique?: boolean;
}

/**
 * Allow declaring a default value for an attribute's value.
 *
 * If not defined, there is no default value and the field will default to `null`.
 */
export interface DefaultOption<T> {
  default?: T | (() => T);
}

/**
 * Specifies whether an attribute can be configured from the admin panel.
 *
 * If not defined, it defaults to false.
 */
export interface ConfigurableOption {
  configurable?: boolean;
}

/**
 * Sets a minimum and/or maximum constraint for an attribute.
 *
 * If any of the property is undefined, there won't be any limit.
 *
 * @template T - The min/max type
 */
export interface MinMaxOption<T = number> {
  min?: T;
  max?: T;
}

/**
 * Sets a minimum length and/or maximum length constraint for the total length for a text based field.
 *
 * If any of the property is undefined, there won't be any limit.
 */
export interface MinMaxLengthOption {
  minLength?: number;
  maxLength?: number;
}

/**
 * Specified whether an attribute's value can be filled using the content API (REST or GraphQL)
 *
 * If not defined, the attribute is considered writable.
 */
export interface WritableOption {
  writable?: boolean;
}

/**
 * Specifies whether an attribute should be visible in the content-manager.
 *
 * If not defined, the attribute is considered visible.
 */
export interface VisibleOption {
  visible?: boolean;
}

/**
 * Setters for the attributes options
 */

// required

/**
 * Forces the attribute to be required.
 *
 * @see RequiredOption
 */
export type Required = { required: true };

/**
 * Forces the attribute to be optional
 *
 * @see RequiredOption
 */
export type NonRequired = { required: false };

// private

/**
 * Forces the attribute to be private
 *
 * @see PrivateOption
 */
export type Private = { private: true };

/**
 * Forces the attribute to not be private
 *
 * @see PrivateOption
 */
export type NonPrivate = { private: false };

// unique

/**
 * Forces the attribute to be unique
 *
 * @see UniqueOption
 */
export type Unique = { unique: true };

/**
 * Forces the attribute not to be unique
 *
 * @see UniqueOption
 */
export type NonUnique = { unique: false };

// configurable

/**
 * Forces the attribute not to be configurable
 *
 * @see ConfigurableOption
 */
export type Configurable = { configurable: true };

/**
 * Forces the attribute not to be configurable
 *
 * @see ConfigurableOption
 */
export type NonConfigurable = { configurable: false };

// writable

/**
 * Forces the attribute to be writable
 *
 * @see WritableOption
 */
export type Writable = { writable: true };

/**
 * Forces the attribute not to be writable
 *
 * @see WritableOption
 */
export type NonWritable = { writable: false };

// visible

/**
 * Forces the attribute to be visible
 *
 * @see VisibleOption
 */
export type Visible = { visible: true };

/**
 * Forces the attribute to be invisible
 *
 * @see VisibleOption
 */
export type NonVisible = { visible: false };

// custom field
export type CustomField<TKind extends string, TOptions extends object | undefined = undefined> = {
  customField: TKind;
  options?: TOptions;
};

// min/max

/**
 * Creates a {@link MinMaxOption} configuration object with the given values.
 *
 * @template TConfig The min/max configuration
 * @template TType The type of the values.
 *
 * @see MinMaxOption
 */
export type SetMinMax<TConfig extends MinMaxOption<TType>, TType = number> = TConfig;

// minLength/maxLength

/**
 * Creates a {@link MinMaxLengthOption} configuration object with the given values.
 *
 * @template TConfig The minLength/maxLength configuration
 *
 * @see MinMaxLengthOption
 */
export type SetMinMaxLength<TConfig extends MinMaxLengthOption> = TConfig;

/**
 * Creates a plugin options' configuration object with the given values.
 *
 * @template TConfig The plugin options
 */
export type SetPluginOptions<TConfig extends object = object> = { pluginOptions?: TConfig };

/**
 * Sets a default value for a {@link DefaultOption}
 *
 * @template T
 *
 * @see DefaultOption
 */
export type DefaultTo<T> = { default: T };
