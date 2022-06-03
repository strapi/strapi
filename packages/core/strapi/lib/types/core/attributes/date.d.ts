import { Attribute } from './base';

export interface DateAttribute extends Attribute<'date'> {}

export type DateValue = Date;

export type GetDateAttributeValue<T extends Attribute> = T extends DateAttribute
  ? DateValue
  : never;
