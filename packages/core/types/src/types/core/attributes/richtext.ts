import type { Attribute } from '..';

export type RichText = Attribute.OfType<'richtext'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<RichTextValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type RichTextValue = string;

export type GetRichTextValue<T extends Attribute.Attribute> = T extends RichText
  ? RichTextValue
  : never;
