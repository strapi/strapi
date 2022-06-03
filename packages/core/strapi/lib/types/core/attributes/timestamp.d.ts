import { Attribute } from './base';

export interface TimestampAttribute extends Attribute<'timestamp'> {}

export type TimestampValue = string;

export type GetTimestampAttributeValue<T extends Attribute> = T extends TimestampAttribute
  ? TimestampValue
  : never;
