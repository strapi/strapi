import type { Attribute } from '..';

export type Email = Attribute.OfType<'email'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<EmailValue> &
  Attribute.MinMaxLengthOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.UniqueOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type EmailValue = string;

export type GetEmailValue<T extends Attribute.Attribute> = T extends Email ? EmailValue : never;
