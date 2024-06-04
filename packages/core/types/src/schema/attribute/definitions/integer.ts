import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents an integer Strapi attribute along with its options
 */
export type Integer = Intersect<
  [
    Attribute.OfType<'integer'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<IntegerValue>,
    Attribute.MinMaxOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
    Attribute.UniqueOption,
  ]
>;

export type IntegerValue = number;

export type GetIntegerValue<T extends Attribute.Attribute> = T extends Integer
  ? IntegerValue
  : never;
