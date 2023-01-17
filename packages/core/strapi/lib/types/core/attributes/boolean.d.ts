import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type BooleanAttribute = Attribute<'boolean'> &
  // Options
  ConfigurableOption &
  DefaultOption<BooleanValue> &
  PrivateOption &
  RequiredOption;

export type BooleanValue = boolean;

export type GetBooleanAttributeValue<T extends Attribute> = T extends BooleanAttribute
  ? BooleanValue
  : never;
