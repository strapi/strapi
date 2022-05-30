import { Attribute } from './base';
import { BaseNumberAttribute } from './common';

export interface DecimalAttribute extends BaseNumberAttribute<'decimal'> {}

export type DecimalValue = number;

export type GetDecimalAttributeValue<T extends Attribute> = T extends DecimalAttribute
  ? DecimalValue
  : never;
