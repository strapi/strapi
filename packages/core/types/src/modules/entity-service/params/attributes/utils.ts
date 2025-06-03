import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type { Object } from '../../../../utils';

export type NonFilterableKind = Extract<Schema.Attribute.Kind, 'password' | 'dynamiczone'>;
export type FilterableKind = Exclude<Schema.Attribute.Kind, NonFilterableKind>;

export type GetNonFilterableKeys<TSchemaUID extends UID.Schema> = Object.KeysBy<
  Schema.Attributes<TSchemaUID>,
  Schema.Attribute.OfType<NonFilterableKind>,
  string
>;

export type GetScalarKeys<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesByType<TSchemaUID, Schema.Attribute.NonPopulatableKind>,
  GetNonFilterableKeys<TSchemaUID>
>;

export type GetNestedKeys<TSchemaUID extends UID.Schema> = Exclude<
  Schema.AttributeNamesWithTarget<TSchemaUID>,
  GetNonFilterableKeys<TSchemaUID>
>;
