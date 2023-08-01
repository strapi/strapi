import type { Attribute } from '@strapi/strapi';

export type Integer = Attribute.OfType<'integer'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<IntegerValue> &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type IntegerValue = number;

export type GetIntegerValue<T extends Attribute.Attribute> = T extends Integer
  ? IntegerValue
  : never;
