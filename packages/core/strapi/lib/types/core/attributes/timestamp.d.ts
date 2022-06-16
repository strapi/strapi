import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type TimestampAttribute = Attribute<'timestamp'> extends infer T
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

export type TimestampValue = string;

export type GetTimestampAttributeValue<T extends Attribute> = T extends TimestampAttribute
  ? TimestampValue
  : never;
