import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a big integer Strapi attribute along with its options
 */
export type BigInteger = Intersect<
  [
    Attribute.OfType<'biginteger'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<BigIntegerValue>,
    Attribute.MinMaxOption<string>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
    Attribute.UniqueOption,
  ]
>;

export type BigIntegerValue = string;

export type GetBigIntegerValue<T extends Attribute.Attribute> = T extends BigInteger
  ? BigIntegerValue
  : never;
