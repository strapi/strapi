import type { Attribute, Common, Utils } from '../../../../types';

export type NonFilterableKind = Extract<Attribute.Kind, 'password' | 'dynamiczone'>;
export type FilterableKind = Exclude<Attribute.Kind, NonFilterableKind>;

export type GetNonFilterableKeys<TSchemaUID extends Common.UID.Schema> = Utils.Object.KeysBy<
  Attribute.GetAll<TSchemaUID>,
  Attribute.OfType<NonFilterableKind>,
  string
>;

export type GetScalarKeys<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetKeysByType<TSchemaUID, Attribute.NonPopulatableKind>,
  GetNonFilterableKeys<TSchemaUID>
>;

export type GetNestedKeys<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetKeysWithTarget<TSchemaUID>,
  GetNonFilterableKeys<TSchemaUID>
>;
