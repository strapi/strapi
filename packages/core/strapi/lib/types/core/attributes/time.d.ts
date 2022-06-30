import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type TimeAttribute = Attribute<'time'> &
  // Options
  ConfigurableOption &
  DefaultOption<TimeValue> &
  PrivateOption &
  RequiredOption &
  UniqueOption;

export type TimeValue = string;

export type GetTimeAttributeValue<T extends Attribute> = T extends TimeAttribute
  ? TimeValue
  : never;
