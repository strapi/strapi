import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a date-time Strapi attribute along with its options
 */
export type DateTime = Intersect<
  [
    Attribute.OfType<'datetime'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<DateTimeValue>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.UniqueOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

// TODO: Use string templates for date formats
export type DateTimeValue = globalThis.Date | string;

export type GetDateTimeValue<T extends Attribute.Attribute> = T extends DateTime
  ? DateTimeValue
  : never;
