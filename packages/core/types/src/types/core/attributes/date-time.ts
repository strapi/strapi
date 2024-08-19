import type { Attribute } from '..';

export type DateTime = Attribute.OfType<'datetime'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<DateTimeValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

// TODO: Use string templates for date formats
export type DateTimeValue = globalThis.Date | string;

export type GetDateTimeValue<T extends Attribute.Attribute> = T extends DateTime
  ? DateTimeValue
  : never;
