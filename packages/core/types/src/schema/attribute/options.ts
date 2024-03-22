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
  default?: T | (() => T);
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

/**
 * Setters for the attributes options
 */

// required
export type Required = { required: true };
export type NonRequired = { required: false };

// private
export type Private = { private: true };
export type NonPrivate = { private: false };

// unique
export type Unique = { unique: true };
export type NonUnique = { unique: false };

// configurable
export type Configurable = { configurable: true };
export type NonConfigurable = { configurable: false };

// writable
export type Writable = { writable: true };
export type NonWritable = { writable: false };

// visible
export type Visible = { visible: true };
export type NonVisible = { visible: false };

// custom field
export type CustomField<TKind extends string, TOptions extends object | undefined = undefined> = {
  customField: TKind;
  options?: TOptions;
};

// min/max
export type SetMinMax<TConfig extends MinMaxOption<TType>, TType = number> = TConfig;

// minLength/maxLength
export type SetMinMaxLength<TConfig extends MinMaxLengthOption> = TConfig;

// pluginOptions
export type SetPluginOptions<TConfig extends object = object> = { pluginOptions?: TConfig };

// default
export type DefaultTo<T> = { default: T };
