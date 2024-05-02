import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a boolean Strapi attribute along with its options
 */
type BooleanAttribute = Intersect<
  [
    Attribute.OfType<'boolean'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<BooleanValue>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type BooleanValue = boolean;

export type GetBooleanValue<T extends Attribute.Attribute> = T extends BooleanAttribute
  ? BooleanValue
  : never;

export type Boolean = BooleanAttribute;
