import type { Attribute } from '@strapi/strapi';

export type Timestamp = Attribute.OfType<'timestamp'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<TimestampValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption;

export type TimestampValue = string;

export type GetTimestampValue<T extends Attribute.Attribute> = T extends Timestamp
  ? TimestampValue
  : never;
