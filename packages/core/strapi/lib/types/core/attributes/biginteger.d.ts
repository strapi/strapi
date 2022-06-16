import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type BigIntegerAttribute = Attribute<'biginteger'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxOption<string> &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type BigIntegerValue = string;

export type GetBigIntegerAttributeValue<T extends Attribute> = T extends BigIntegerAttribute
  ? BigIntegerValue
  : never;
