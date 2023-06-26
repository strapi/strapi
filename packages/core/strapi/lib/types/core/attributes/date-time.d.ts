import type { Attribute } from '@strapi/strapi';

export type DateTime = Attribute.OfType<'datetime'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<DateTimeValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption;

export type DateTimeValue = string;

export type GetDateTimeValue<T extends Attribute.Attribute> = T extends DateTime
  ? DateTimeValue
  : never;
