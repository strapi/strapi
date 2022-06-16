import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxOption,
  PrivateOption,
  RequiredOption,
} from './base';

export type FloatAttribute = Attribute<'float'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        MinMaxOption &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type FloatValue = number;

export type GetFloatAttributeValue<T extends Attribute> = T extends FloatAttribute
  ? FloatValue
  : never;
