import type { Attribute } from '..';
import type { Utils } from '../..';

export interface EnumerationProperties<TValues extends string[] = []> {
  enum: TValues;
  enumName?: string;
}

export type Enumeration<TValues extends string[] = []> = Attribute.OfType<'enumeration'> &
  EnumerationProperties<TValues> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<TValues[number]> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type EnumerationValue<TValues extends string[]> = Utils.Array.Values<TValues>;

export type GetEnumerationValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Enumeration<infer TValues> ? EnumerationValue<TValues> : never;
