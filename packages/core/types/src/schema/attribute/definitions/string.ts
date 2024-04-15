import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

export interface StringProperties {
  regex?: RegExp;
}

/**
 * Represents a string Strapi attribute along with its options
 */
type StringAttribute = Intersect<
  [
    Attribute.OfType<'string'>,
    // Properties
    StringProperties,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<StringValue>,
    Attribute.MinMaxLengthOption,
    Attribute.PrivateOption,
    Attribute.UniqueOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type StringValue = string;

export type GetStringValue<T extends Attribute.Attribute> = T extends StringAttribute
  ? StringValue
  : never;

/**
 * Represents a string Strapi attribute along with its options
 */
export type String = StringAttribute;
