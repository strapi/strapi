import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type EmailAttribute = Attribute<'email'> &
  // Options
  ConfigurableOption &
  DefaultOption<EmailValue> &
  MinMaxLengthOption &
  PrivateOption &
  RequiredOption &
  UniqueOption;

export type EmailValue = string;

export type GetEmailAttributeValue<T extends Attribute> = T extends EmailAttribute
  ? EmailValue
  : never;
