import type { Attribute } from '@strapi/strapi';

export type Float = Attribute.OfType<'float'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<FloatValue> &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type FloatValue = number;

export type GetFloatValue<T extends Attribute.Attribute> = T extends Float ? FloatValue : never;
