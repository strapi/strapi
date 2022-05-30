import { Attribute } from './base';

export interface BooleanAttribute extends Attribute<'boolean'> {}

export type BooleanValue = boolean;

export type GetBooleanAttributeValue<T extends Attribute> = T extends BooleanAttribute
  ? BooleanValue
  : never;
