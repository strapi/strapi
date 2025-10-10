import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a rich-text Strapi attribute along with its options
 */
export type RichText = Intersect<
  [
    Attribute.OfType<'richtext'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<RichTextValue>,
    Attribute.MinMaxLengthOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type RichTextValue = string;

export type GetRichTextValue<T extends Attribute.Attribute> = T extends RichText
  ? RichTextValue
  : never;
