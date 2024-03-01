import type { Intersect } from '../../../utils';
import type { Attribute } from '../../../schema';

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
    Attribute.UniqueOption
  ]
>;

export type IntegerValue = number;

export type GetIntegerValue<T extends Attribute.Attribute> = T extends Integer
  ? IntegerValue
  : never;
