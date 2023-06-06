import type { Attribute, Utils } from '@strapi/strapi';

export interface EnumerationProperties<TValues extends string[] = []> {
  enum: TValues;
}

export type Enumeration<TValues extends string[] = []> = Attribute.OfType<'enumeration'> &
  EnumerationProperties<TValues> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<TValues> &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type EnumerationValue<TValues extends string[]> = Utils.Array.Values<TValues>;

export type GetEnumerationValue<TAttribute extends Attribute.Attribute> =
  TAttribute extends Enumeration<infer TValues> ? EnumerationValue<TValues> : never;
