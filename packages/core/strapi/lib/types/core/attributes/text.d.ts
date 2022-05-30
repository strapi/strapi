import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface TextAttribute extends BaseStringAttribute<'text'> {}

export type TextValue = string;

export type GetTextAttributeValue<T extends Attribute> = T extends TextAttribute ? TextValue : never;
