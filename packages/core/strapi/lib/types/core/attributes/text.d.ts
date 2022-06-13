import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface TextAttribute<T extends RegExp = undefined> extends BaseStringAttribute<'text'> {
  regex: T;
}

export type TextValue = string;

export type GetTextAttributeValue<T extends Attribute> = T extends TextAttribute
  ? TextValue
  : never;
