import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type TimeAttribute = Attribute<'time'> extends infer T
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

export type TimeValue = string;

export type GetTimeAttributeValue<T extends Attribute> = T extends TimeAttribute
  ? TimeValue
  : never;
