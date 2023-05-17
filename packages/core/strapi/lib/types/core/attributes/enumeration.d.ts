import type { Attribute, Utils } from '@strapi/strapi';

export interface EnumerationProperties<T extends string[] = []> {
  enum: T;
}

export type Enumeration<T extends string[] = []> = Attribute.Attribute<'enumeration'> &
  EnumerationProperties<T> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<T> &
  Attribute.PrivateOption &
  Attribute.RequiredOption;

export type EnumerationValue<T extends string[]> = Utils.GetArrayValues<T>;

export type GetEnumerationValue<T extends Attribute.Attribute> = T extends Enumeration<infer U>
  ? EnumerationValue<U>
  : never;
