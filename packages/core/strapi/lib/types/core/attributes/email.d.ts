import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface EmailAttribute extends BaseStringAttribute<'email'> {}

export type EmailValue = string;

export type GetEmailAttributeValue<T extends Attribute> = T extends EmailAttribute
  ? EmailValue
  : never;
