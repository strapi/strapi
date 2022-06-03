import { Attribute } from './base';

export interface DateTimeAttribute extends Attribute<'datetime'> {}

export type DateTimeValue = string;

export type GetDateTimeAttributeValue<T extends Attribute> = T extends DateTimeAttribute
  ? DateTimeValue
  : never;
