import type { Attribute } from '@strapi/strapi';

export interface TextProperties {
  regex?: RegExp;
}

export type Text = Attribute.OfType<'text'> &
  // Properties
  TextProperties &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<TextValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.UniqueOption &
  Attribute.RequiredOption;

export type TextValue = string;

export type GetTextValue<T extends Attribute.Attribute> = T extends Text ? TextValue : never;
