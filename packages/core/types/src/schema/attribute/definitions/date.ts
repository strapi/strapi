import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a date Strapi attribute along with its options
 */
export type Date = Intersect<
  [
    Attribute.OfType<'date'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<DateValue>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.UniqueOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type DateValue = globalThis.Date | string;

export type GetDateValue<T extends Attribute.Attribute> = T extends Date ? DateValue : never;
