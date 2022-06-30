import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type DateAttribute = Attribute<'date'> &
  // Options
  ConfigurableOption &
  DefaultOption<DateValue> &
  PrivateOption &
  RequiredOption &
  UniqueOption;

export type DateValue = Date;

export type GetDateAttributeValue<T extends Attribute> = T extends DateAttribute
  ? DateValue
  : never;
