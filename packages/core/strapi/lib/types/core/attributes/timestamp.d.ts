import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type TimestampAttribute = Attribute<'timestamp'> &
  // Options
  ConfigurableOption &
  DefaultOption<TimestampValue> &
  PrivateOption &
  RequiredOption &
  UniqueOption;

export type TimestampValue = string;

export type GetTimestampAttributeValue<T extends Attribute> = T extends TimestampAttribute
  ? TimestampValue
  : never;
