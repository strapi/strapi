/**
 * Strapi custom scalar types
 */

import type { Attribute } from '@strapi/strapi';

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
export type CustomField<T extends string, P extends object = undefined> = {
  customField: T;
  options?: P;
};

// min/max
export type SetMinMax<T extends Attribute.MinMaxOption<U>, U = number> = T;

// minLength/maxLength
export type SetMinMaxLength<T extends Attribute.MinMaxLengthOption> = T;

// pluginOptions
export type SetPluginOptions<T extends object = object> = { pluginOptions?: T };

// default
export type DefaultTo<T> = { default: T };

// Any Attribute
export type Any =
  | Attribute.BigInteger
  | Attribute.Boolean
  | Attribute.Component
  | Attribute.DateTime
  | Attribute.Date
  | Attribute.Decimal
  | Attribute.DynamicZone
  | Attribute.Email
  | Attribute.Enumeration
  | Attribute.Float
  | Attribute.JSON
  | Attribute.Media
  | Attribute.Password
  | Attribute.Relation
  | Attribute.RichText
  | Attribute.String
  | Attribute.Text
  | Attribute.Time
  | Attribute.Timestamp
  | Attribute.UID;
