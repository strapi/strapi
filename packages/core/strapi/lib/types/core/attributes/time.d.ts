import type { Attribute } from '@strapi/strapi';

export type Time = Attribute.OfType<'time'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<TimeValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption;

export type TimeValue = globalThis.Date | string;

export type GetTimeValue<T extends Attribute.Attribute> = T extends Time ? TimeValue : never;
