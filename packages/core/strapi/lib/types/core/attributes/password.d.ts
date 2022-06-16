import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
} from './base';

// export interface PasswordAttribute extends BaseStringAttribute<'password'> {}

export type PasswordAttribute = Attribute<'password'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxLengthOption &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type PasswordValue = string;

export type GetPasswordAttributeValue<T extends Attribute> = T extends PasswordAttribute
  ? PasswordValue
  : never;
