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

export type GetKeys<TSchemaUID extends Common.UID.Schema> = keyof GetAll<TSchemaUID>;

export type GetValue<TAttribute extends Attribute.Attribute> =
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
  | Attribute.GetTimestampValue<TAttribute>;

export type GetValueByKey<
  TSchemaUID extends Common.UID.Schema,
  TKey extends GetKeys<TSchemaUID>
> = Get<TSchemaUID, TKey> extends infer TAttribute extends Attribute.Attribute
  ? GetValue<TAttribute>
  : never;

export type GetValues<
  TSchemaUID extends Common.UID.Schema,
  TKey extends GetKeys<TSchemaUID> = GetKeys<TSchemaUID>
> = {
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
  { required: true }
>;

export type GetOptionalKeys<TSchemaUID extends Common.UID.Schema> = keyof Omit<
  GetAll<TSchemaUID>,
  GetRequiredKeys<TSchemaUID>
>;
