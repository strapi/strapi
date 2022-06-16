import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export interface TextAttributeProperties {
  regex?: RegExp;
}

export type TextAttribute = Attribute<'text'> &
  // Properties
  TextAttributeProperties extends infer U
  ? U extends Attribute
    ? U &
        // Options
        ConfigurableOption &
        DefaultOption<U> &
        MinMaxLengthOption &
        PrivateOption &
        UniqueOption &
        RequiredOption
    : never
  : never;

export type TextValue = string;

export type GetTextAttributeValue<T extends Attribute> = T extends TextAttribute
  ? TextValue
  : never;
