import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export interface StringAttributeProperties {
  regex?: RegExp;
}

export type StringAttribute = Attribute<'string'> &
  // Properties
  StringAttributeProperties &
  // Options
  ConfigurableOption &
  DefaultOption<StringValue> &
  MinMaxLengthOption &
  PrivateOption &
  UniqueOption &
  RequiredOption;

export type StringValue = string;

export type GetStringAttributeValue<T extends Attribute> = T extends StringAttribute
  ? StringValue
  : never;
