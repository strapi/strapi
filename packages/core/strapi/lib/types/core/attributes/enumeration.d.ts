import { GetArrayValues } from '../../utils';
import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  PrivateOption,
  RequiredOption,
} from './base';

export interface EnumerationAttributeProperties<T extends string[] = []> {
  enum: T;
}

export type EnumerationAttribute<T extends string[] = []> = Attribute<'enumeration'> &
  EnumerationAttributeProperties<T> extends infer U
  ? U extends Attribute
    ? U &
        // Options
        ConfigurableOption &
        DefaultOption<U> &
        PrivateOption &
        RequiredOption
    : never
  : never;

export type EnumerationValue<T extends string[]> = GetArrayValues<T>;

export type GetEnumerationAttributeValue<T extends Attribute> = T extends EnumerationAttribute<
  infer U
>
  ? EnumerationValue<U>
  : never;
