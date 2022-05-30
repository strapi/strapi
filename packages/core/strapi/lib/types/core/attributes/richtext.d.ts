import { Attribute } from './base';
import { BaseStringAttribute } from './common';

export interface RichTextAttribute extends BaseStringAttribute<'richtext'> {}

export type RichTextValue = string;

export type GetRichTextAttributeValue<T extends Attribute> = T extends RichTextAttribute
  ? RichTextValue
  : never;
