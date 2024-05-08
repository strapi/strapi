import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a time Strapi attribute along with its options
 */
export type Time = Intersect<
  [
    Attribute.OfType<'time'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<TimeValue>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.UniqueOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type TimeValue = globalThis.Date | string;

export type GetTimeValue<T extends Attribute.Attribute> = T extends Time ? TimeValue : never;
