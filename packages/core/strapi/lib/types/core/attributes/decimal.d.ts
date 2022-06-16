import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type DecimalAttribute = Attribute<'decimal'> extends infer T
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

export type DecimalValue = number;

export type GetDecimalAttributeValue<T extends Attribute> = T extends DecimalAttribute
  ? DecimalValue
  : never;
