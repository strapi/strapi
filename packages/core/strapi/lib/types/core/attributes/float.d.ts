import { Attribute } from './base';
import { BaseNumberAttribute } from './common';

export interface FloatAttribute extends BaseNumberAttribute<'float'> {}

export type FloatValue = number;

export type GetFloatAttributeValue<T extends Attribute> = T extends FloatAttribute
  ? FloatValue
  : never;
