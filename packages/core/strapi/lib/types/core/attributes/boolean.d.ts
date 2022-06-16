import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type BooleanAttribute = Attribute<'boolean'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type BooleanValue = boolean;

export type GetBooleanAttributeValue<T extends Attribute> = T extends BooleanAttribute
  ? BooleanValue
  : never;
