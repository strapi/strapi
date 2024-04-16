import type { Array, Intersect } from '../../../utils';
import type { Attribute } from '../..';

export interface EnumerationProperties<TValues extends string[] = []> {
  enum: TValues;
  enumName?: string;
}

/**
 * Represents an enumeration Strapi attribute along with its options
 */
export type Enumeration<TValues extends string[] = []> = Intersect<
  [
    Attribute.OfType<'enumeration'>,
    // Properties
    EnumerationProperties<TValues>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<TValues[number]>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type EnumerationValue<TValues extends string[]> = Array.Values<TValues>;

export type GetEnumerationValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Enumeration<infer TValues> ? EnumerationValue<TValues> : never;
