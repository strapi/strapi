import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type IntegerAttribute = Attribute<'integer'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxOption &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type IntegerValue = number;

export type GetIntegerAttributeValue<T extends Attribute> = T extends IntegerAttribute
  ? IntegerValue
  : never;
