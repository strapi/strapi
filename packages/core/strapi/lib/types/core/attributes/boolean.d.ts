import type { Attribute } from '@strapi/strapi';

export type Boolean = Attribute.OfType<'boolean'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<BooleanValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type BooleanValue = boolean;

export type GetBooleanValue<T extends Attribute.Attribute> = T extends Boolean
  ? BooleanValue
  : never;
