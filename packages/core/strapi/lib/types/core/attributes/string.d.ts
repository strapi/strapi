import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface StringAttribute extends BaseStringAttribute<'string'> {}

export type StringValue = string;

export type GetStringAttributeValue<T extends Attribute> = T extends StringAttribute
  ? StringValue
  : never;
