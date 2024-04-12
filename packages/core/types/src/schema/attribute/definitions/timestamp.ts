import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a timestamp Strapi attribute along with its options
 */
export type Timestamp = Intersect<
  [
    Attribute.OfType<'timestamp'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<TimestampValue>,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.UniqueOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type TimestampValue = globalThis.Date | number | string;

export type GetTimestampValue<T extends Attribute.Attribute> = T extends Timestamp
  ? TimestampValue
  : never;
