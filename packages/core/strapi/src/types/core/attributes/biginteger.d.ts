import type { Attribute } from '@strapi/strapi';

export type BigInteger = Attribute.OfType<'biginteger'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<BigIntegerValue> &
  Attribute.MinMaxOption<string> &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type BigIntegerValue = string;

export type GetBigIntegerValue<T extends Attribute.Attribute> = T extends BigInteger
  ? BigIntegerValue
  : never;
