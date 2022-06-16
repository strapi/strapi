import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
  UniqueOption,
} from './base';

export type DateAttribute = Attribute<'date'> extends infer T
  ? T extends Attribute
    ? T &
        // Options
        ConfigurableOption &
        DefaultOption<T> &
        PrivateOption &
        RequiredOption &
        UniqueOption
    : never
  : never;

export type DateValue = Date;

export type GetDateAttributeValue<T extends Attribute> = T extends DateAttribute
  ? DateValue
  : never;
