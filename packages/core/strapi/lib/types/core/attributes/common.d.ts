import { SchemaUID } from '../../utils';
import { SchemaAttributes } from '../schemas';
import { Attribute } from './base';
import { GetAttributes, PickTypes } from './utils';

// Common Strapi types' union (string, number, etc...)

export type StringTypes = PickTypes<'string' | 'text' | 'richtext' | 'password'>;

export type NumberTypes = PickTypes<'integer' | 'biginteger' | 'float' | 'decimal'>;

/**
 * Attributes abstractions for those sharing common properties
 */

// Number

export interface BaseNumberAttribute<T extends NumberTypes = NumberTypes> extends Attribute<T> {
  min?: number;
  max?: number;
}

export type NumberAttributeValue<T extends Attribute> = T extends BaseNumberAttribute
  ? number
  : never;

// String

export interface BaseStringAttribute<T extends StringTypes = StringTypes> extends Attribute<T> {
  minLength?: number;
  maxLength?: number;
}

export type StringAttributeValue<T extends Attribute> = T extends BaseStringAttribute
  ? string
  : never;

/**
 * Misc
 */

export interface RequiredAttribute extends Pick<Attribute, 'required'> {
  required: true;
}
