import type { Intersect } from '../../../utils';
import type { Attribute } from '../../../schema';

export type Decimal = Intersect<
  [
    Attribute.OfType<'decimal'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<DecimalValue>,
    Attribute.MinMaxOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
    Attribute.UniqueOption
  ]
>;

export type DecimalValue = number;

export type GetDecimalValue<T extends Attribute.Attribute> = T extends Decimal
  ? DecimalValue
  : never;
