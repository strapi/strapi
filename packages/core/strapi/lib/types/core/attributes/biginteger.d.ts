import { Attribute } from './base';
import { BaseNumberAttribute, NumberAttributeValue } from './common';

export interface BigIntegerAttribute extends BaseNumberAttribute<'biginteger'> {}

export type BigIntegerValue = string;

export type GetBigIntegerAttributeValue<T extends Attribute> = NumberAttributeValue<T>;
