import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type IntegerAttribute = Attribute<'integer'> &
  // Options
  ConfigurableOption &
  DefaultOption<IntegerValue> &
  MinMaxOption &
  PrivateOption &
  RequiredOption;

export type IntegerValue = number;

export type GetIntegerAttributeValue<T extends Attribute> = T extends IntegerAttribute
  ? IntegerValue
  : never;
