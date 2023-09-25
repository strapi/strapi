import type { Attribute } from '..';

export type BigInteger = Attribute.OfType<'biginteger'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<BigIntegerValue> &
  Attribute.MinMaxOption<string> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption &
  Attribute.UniqueOption;

export type BigIntegerValue = string;

export type GetBigIntegerValue<T extends Attribute.Attribute> = T extends BigInteger
  ? BigIntegerValue
  : never;
