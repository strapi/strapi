import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a float Strapi attribute along with its options
 */
export type Float = Intersect<
  [
    Attribute.OfType<'float'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<FloatValue>,
    Attribute.MinMaxOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
    Attribute.UniqueOption,
  ]
>;

export type FloatValue = number;

export type GetFloatValue<T extends Attribute.Attribute> = T extends Float ? FloatValue : never;
