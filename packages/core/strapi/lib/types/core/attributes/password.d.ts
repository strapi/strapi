import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface PasswordAttribute extends BaseStringAttribute<'password'> {}

export type PasswordValue = string;

export type GetPasswordAttributeValue<T extends Attribute> = T extends PasswordAttribute
  ? PasswordValue
  : never;
