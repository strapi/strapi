import type { Attribute } from '..';

type BooleanAttribute = Attribute.OfType<'boolean'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.DefaultOption<BooleanValue> &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

export type BooleanValue = boolean;

export type GetBooleanValue<T extends Attribute.Attribute> = T extends BooleanAttribute
  ? BooleanValue
  : never;

export type Boolean = BooleanAttribute;
