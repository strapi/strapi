import type { Attribute, Common, Utils } from '@strapi/strapi';

export type GetKeysByType<
  TSchemaUID extends Common.UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never
> = Utils.Object.KeysBy<
  GetAll<TSchemaUID>,
  Attribute.OfType<TKind> & Utils.Guard.Never<TCondition, unknown>
>;

export type GetByType<
  TSchemaUID extends Common.UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never
> = Utils.Object.PickBy<
  GetAll<TSchemaUID>,
  Attribute.OfType<TKind> & Utils.Guard.Never<TCondition, unknown>
>;

export type Get<TSchemaUID extends Common.UID.Schema, TKey extends GetKeys<TSchemaUID>> = Utils.Get<
  GetAll<TSchemaUID>,
  TKey
>;

export type GetAll<TSchemaUID extends Common.UID.Schema> = Utils.Get<
  Common.Schemas[TSchemaUID],
  'attributes'
>;

export type GetTarget<TSchemaUID extends Common.UID.Schema, TKey extends GetKeys<TSchemaUID>> = Get<
  TSchemaUID,
  TKey
> extends infer TAttribute extends Attribute.Attribute
  ?
      | Attribute.GetRelationTarget<TAttribute>
      | Attribute.GetComponentTarget<TAttribute>
      | Attribute.GetMediaTarget<TAttribute>
  : never;

export type GetMorphTargets<
  TSchemaUID extends Common.UID.Schema,
  TKey extends GetKeys<TSchemaUID>
> = Get<TSchemaUID, TKey> extends infer TAttribute extends Attribute.Attribute
  ? Attribute.GetDynamicZoneTargets<TAttribute>
  : never;

export type GetKeys<TSchemaUID extends Common.UID.Schema> = keyof GetAll<TSchemaUID>;

export type GetNonPopulatableKeys<TSchemaUID extends Common.UID.Schema> = GetKeysByType<
  TSchemaUID,
  Attribute.NonPopulatableKind
>;

export type GetPopulatableKeys<TSchemaUID extends Common.UID.Schema> = GetKeysByType<
  TSchemaUID,
  Attribute.PopulatableKind
>;

export type GetKeysWithTarget<TSchemaUID extends Common.UID.Schema> = keyof {
  [key in GetKeys<TSchemaUID> as GetTarget<TSchemaUID, key> extends never ? never : key]: never;
} extends infer TKey extends GetKeys<TSchemaUID>
  ? TKey
  : never;

export type GetValue<TAttribute extends Attribute.Attribute, TGuard = unknown> = Utils.Guard.Never<
  | Attribute.GetBigIntegerValue<TAttribute>
  | Attribute.GetBooleanValue<TAttribute>
  | Attribute.GetComponentValue<TAttribute>
  | Attribute.GetDecimalValue<TAttribute>
  | Attribute.GetDynamicZoneValue<TAttribute>
  | Attribute.GetEnumerationValue<TAttribute>
  | Attribute.GetEmailValue<TAttribute>
  | Attribute.GetFloatValue<TAttribute>
  | Attribute.GetIntegerValue<TAttribute>
  | Attribute.GetJsonValue<TAttribute>
  | Attribute.GetMediaValue<TAttribute>
  | Attribute.GetPasswordValue<TAttribute>
  | Attribute.GetRelationValue<TAttribute>
  | Attribute.GetRichTextValue<TAttribute>
  | Attribute.GetStringValue<TAttribute>
  | Attribute.GetTextValue<TAttribute>
  | Attribute.GetUIDValue<TAttribute>
  | Attribute.GetDateValue<TAttribute>
  | Attribute.GetDateTimeValue<TAttribute>
  | Attribute.GetTimeValue<TAttribute>
  | Attribute.GetTimestampValue<TAttribute>,
  TGuard
>;

export type GetValueByKey<
  TSchemaUID extends Common.UID.Schema,
  TKey extends GetKeys<TSchemaUID>
> = Get<TSchemaUID, TKey> extends infer TAttribute extends Attribute.Attribute
  ? GetValue<TAttribute>
  : never;

export type GetValues<
  TSchemaUID extends Common.UID.Schema,
  TKey extends GetKeys<TSchemaUID> = GetKeys<TSchemaUID>
> = { id: number | `${number}` } & {
  // Handle required attributes
  [key in GetRequiredKeys<TSchemaUID> as key extends TKey ? key : never]-?: GetValueByKey<
    TSchemaUID,
    key
  >;
} & {
  // Handle optional attributes
  [key in GetOptionalKeys<TSchemaUID> as key extends TKey ? key : never]?: GetValueByKey<
    TSchemaUID,
    key
  >;
};

export type GetRequiredKeys<TSchemaUID extends Common.UID.Schema> = Utils.Object.KeysBy<
  GetAll<TSchemaUID>,
  Attribute.Required
>;

export type GetOptionalKeys<TSchemaUID extends Common.UID.Schema> = Utils.Object.KeysExcept<
  GetAll<TSchemaUID>,
  Attribute.Required
>;

export type HasTarget<
  TSchemaUID extends Common.UID.Schema,
  TField extends Attribute.GetKeys<TSchemaUID>
> = GetTarget<TSchemaUID, TField> extends infer TTarget
  ? Utils.Expression.And<
      Utils.Expression.IsNotNever<TTarget>,
      Utils.Expression.Extends<TTarget, Common.UID.Schema>
    >
  : Utils.Expression.False;

export type HasMorphTargets<
  TSchemaUID extends Common.UID.Schema,
  TField extends Attribute.GetKeys<TSchemaUID>
> = GetMorphTargets<TSchemaUID, TField> extends infer TMaybeTargets
  ? Utils.Expression.And<
      Utils.Expression.IsNotNever<TMaybeTargets>,
      Utils.Expression.Extends<TMaybeTargets, Common.UID.Schema>
    >
  : Utils.Expression.False;
