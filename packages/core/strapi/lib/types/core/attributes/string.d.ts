import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface StringAttribute<T extends RegExp = undefined>
  extends BaseStringAttribute<'string'> {
  regex?: T;
}

export type StringValue = string;

export type GetStringAttributeValue<T extends Attribute> = T extends StringAttribute
  ? StringValue
  : never;
