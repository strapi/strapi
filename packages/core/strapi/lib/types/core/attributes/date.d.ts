import type { Attribute } from '@strapi/strapi';

export type Date = Attribute.OfType<'date'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<DateValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption;

export type DateValue = globalThis.Date | string;

export type GetDateValue<T extends Attribute.Attribute> = T extends Date ? DateValue : never;
