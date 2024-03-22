import type { Attribute } from '../../../../schema';

export type BooleanValue = boolean | 'true' | 'false' | 't' | 'f' | '1' | '0' | 1 | 0;

export type NumberValue = string | number;

export type DateValue = Attribute.DateValue | number;

export type TimeValue = Attribute.TimeValue | number;

export type DateTimeValue = Attribute.DateTimeValue | number;

export type TimeStampValue = Attribute.TimestampValue;
