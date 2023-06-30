/**
 * Strapi custom scalar types
 */

import { Attribute, Common } from '@strapi/strapi';

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

// custom field
export type CustomField<TKind extends string, TOptions extends object | undefined = undefined> = {
  customField: TKind;
  options?: TOptions;
};

// min/max
export type SetMinMax<TConfig extends Attribute.MinMaxOption<TType>, TType = number> = TConfig;

// minLength/maxLength
export type SetMinMaxLength<TConfig extends Attribute.MinMaxLengthOption> = TConfig;

// pluginOptions
export type SetPluginOptions<TConfig extends object = object> = { pluginOptions?: TConfig };

// default
export type DefaultTo<T> = { default: T };

// Any Attribute
export type Any =
  | Attribute.BigInteger
  | Attribute.Boolean
  | Attribute.Component<Common.UID.Component, boolean>
  | Attribute.DateTime
  | Attribute.Date
  | Attribute.Decimal
  | Attribute.DynamicZone
  | Attribute.Email
  | Attribute.Enumeration<string[]>
  | Attribute.Float
  | Attribute.Integer
  | Attribute.JSON
  | Attribute.Media<Attribute.MediaKind | undefined, boolean>
  | Attribute.Password
  | (
      | Attribute.Relation<
          Common.UID.Schema,
          Attribute.RelationKind.BiDirectional,
          Common.UID.Schema
        >
      | Attribute.Relation<Common.UID.Schema, Attribute.RelationKind.UniDirectional>
    )
  | Attribute.RichText
  | Attribute.String
  | Attribute.Text
  | Attribute.Time
  | Attribute.Timestamp
  | Attribute.UID<Common.UID.Schema | undefined>;
