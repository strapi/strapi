import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type DateTimeAttribute = Attribute<'datetime'> &
  // Options
  ConfigurableOption &
  DefaultOption<DateTimeValue> &
  PrivateOption &
  RequiredOption &
  UniqueOption;

export type DateTimeValue = string;

export type GetDateTimeAttributeValue<T extends Attribute> = T extends DateTimeAttribute
  ? DateTimeValue
  : never;
