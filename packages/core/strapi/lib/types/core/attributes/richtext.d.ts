import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type RichTextAttribute = Attribute<'richtext'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxLengthOption &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type RichTextValue = string;

export type GetRichTextAttributeValue<T extends Attribute> = T extends RichTextAttribute
  ? RichTextValue
  : never;
