import type { Attribute } from '@strapi/strapi';

export interface StringProperties {
  regex?: RegExp;
}

export type String = Attribute.OfType<'string'> &
  // Properties
  StringProperties &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<StringValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.UniqueOption &
  Attribute.RequiredOption;

export type StringValue = string;

export type GetStringValue<T extends Attribute.Attribute> = T extends String ? StringValue : never;
