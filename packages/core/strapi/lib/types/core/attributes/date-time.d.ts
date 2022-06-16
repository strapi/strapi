import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type DateTimeAttribute = Attribute<'datetime'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        PrivateOption &
        RequiredOption &
        UniqueOption
    : never
  : never;

export type DateTimeValue = string;

export type GetDateTimeAttributeValue<T extends Attribute> = T extends DateTimeAttribute
  ? DateTimeValue
  : never;
