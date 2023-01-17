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
  TextAttributeProperties &
  // Options
  ConfigurableOption &
  DefaultOption<TextValue> &
  MinMaxLengthOption &
  PrivateOption &
  UniqueOption &
  RequiredOption;

export type TextValue = string;

export type GetTextAttributeValue<T extends Attribute> = T extends TextAttribute
  ? TextValue
  : never;
