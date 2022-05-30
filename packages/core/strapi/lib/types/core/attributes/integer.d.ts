import { Attribute } from './base';
import { BaseNumberAttribute } from './common';

export interface IntegerAttribute extends BaseNumberAttribute<'integer'> {}

export type IntegerValue = number;

export type GetIntegerAttributeValue<T extends Attribute> = T extends IntegerAttribute
  ? IntegerValue
  : never;
