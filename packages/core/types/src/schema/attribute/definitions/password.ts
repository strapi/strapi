import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

export type Password = Intersect<
  [
    Attribute.OfType<'password'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.DefaultOption<PasswordValue>,
    Attribute.MinMaxLengthOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption
  ]
>;

export type PasswordValue = string;

export type GetPasswordValue<T extends Attribute.Attribute> = T extends Password
  ? PasswordValue
  : never;
