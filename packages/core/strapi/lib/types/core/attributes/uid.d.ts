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
  // Own Schema Reference
  T extends SchemaUID | undefined = undefined,
  // Target attribute
  U extends T extends SchemaUID
    ? GetAttributesKeysByType<T, 'string' | 'text'>
    : undefined = undefined,
  // UID options
  S extends UIDAttributeOptions = UIDAttributeOptions
> {
  targetField?: U;
  options?: UIDAttributeOptions & S;
}

export type UIDAttribute<
  // Own Schema Reference
  T extends SchemaUID | undefined = undefined,
  // Target attribute
  U extends T extends SchemaUID
    ? GetAttributesKeysByType<T, 'string' | 'text'>
    : undefined = undefined,
  // UID options
  S extends UIDAttributeOptions = UIDAttributeOptions
> = Attribute<'uid'> &
  // Properties
  UIDAttributeProperties<T, U, S> &
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
