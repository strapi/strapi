import type { Attribute } from '@strapi/strapi';

export type Decimal = Attribute.OfType<'decimal'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<DecimalValue> &
  Attribute.MinMaxOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type DecimalValue = number;

export type GetDecimalValue<T extends Attribute.Attribute> = T extends Decimal
  ? DecimalValue
  : never;
