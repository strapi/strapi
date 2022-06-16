import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type EmailAttribute = Attribute<'email'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxLengthOption &
        PrivateOption &
        RequiredOption &
        UniqueOption
    : never
  : never;

export type EmailValue = string;

export type GetEmailAttributeValue<T extends Attribute> = T extends EmailAttribute
  ? EmailValue
  : never;
