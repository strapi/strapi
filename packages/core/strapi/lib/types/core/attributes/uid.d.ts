import { Attribute } from './base';
import { SchemaUID } from '../../utils';
import { GetAttributesKeysByType } from './utils';

export interface UIDAttribute<T extends SchemaUID, U extends GetAttributesKeysByType<T, 'string'>>
  extends Attribute<'uid'> {
  targetField?: U;
}

export type UIDValue = string;

export type GetUIDAttributeValue<T extends Attribute> = T extends UIDAttribute<infer _U, infer _P>
  ? UIDValue
  : never;
