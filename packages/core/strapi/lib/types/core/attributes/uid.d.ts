import { Attribute } from './base';
import { SchemaUID } from '../../utils';
import { GetAttributesKeysByType } from './utils';
import { BaseStringAttribute } from './common';

export interface UIDAttributeOptions {
  separator?: string;
  lowercase?: boolean;
  decamelize?: boolean;
  customReplacements?: any;
  preserveLeadingUnderscore?: boolean;
}

export interface UIDAttribute<
  T extends SchemaUID = undefined,
  U extends GetAttributesKeysByType<T, 'string' | 'text'> = unknown
> extends BaseStringAttribute<'uid'> {
  targetField?: U;
  options?: UIDAttributeOptions;
}

export type UIDValue = string;

export type GetUIDAttributeValue<T extends Attribute> = T extends UIDAttribute<infer _U, infer _P>
  ? UIDValue
  : never;
