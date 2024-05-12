import type { Attribute } from '..';

export type Password = Attribute.OfType<'password'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<PasswordValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type PasswordValue = string;

export type GetPasswordValue<T extends Attribute.Attribute> = T extends Password
  ? PasswordValue
  : never;
