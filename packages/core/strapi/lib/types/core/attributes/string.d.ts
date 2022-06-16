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
  StringAttributeProperties extends infer U
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

export type StringValue = string;

export type GetStringAttributeValue<T extends Attribute> = T extends StringAttribute
  ? StringValue
  : never;
