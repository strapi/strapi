import {
  Attribute,
  ConfigurableOption,
  DefaultOption,
  MinMaxLengthOption,
  PrivateOption,
  RequiredOption,
} from './base';
import { SchemaUID } from '../../utils';
import { GetAttributesKeysByType } from './utils';

export interface UIDAttributeOptions {
  separator?: string;
  lowercase?: boolean;
  decamelize?: boolean;
  customReplacements?: Array<[string, string]>;
  preserveLeadingUnderscore?: boolean;
}

export interface UIDAttributeProperties<
  // UID options
  S extends UIDAttributeOptions = UIDAttributeOptions,
  // Own Schema Reference
  T extends SchemaUID | undefined = undefined,
  // Target attribute
  U extends T extends SchemaUID
    ? GetAttributesKeysByType<T, 'string' | 'text'>
    : undefined = undefined
> {
  targetField?: U;
  options?: S;
}

export type UIDAttribute<
  // UID options
  S extends UIDAttributeOptions = UIDAttributeOptions,
  // Own Schema Reference
  T extends SchemaUID | undefined = undefined,
  // Target attribute
  U extends T extends SchemaUID
    ? GetAttributesKeysByType<T, 'string' | 'text'>
    : undefined = undefined
> = Attribute<'uid'> &
  // Properties
  UIDAttributeProperties<S, T, U> &
  // Options
  ConfigurableOption &
  DefaultOption<UIDValue> &
  MinMaxLengthOption &
  PrivateOption &
  RequiredOption;

export type UIDValue = string;

export type GetUIDAttributeValue<T extends Attribute> = T extends UIDAttribute<infer _U, infer _P>
  ? UIDValue
  : never;
