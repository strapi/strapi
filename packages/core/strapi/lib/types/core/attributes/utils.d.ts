import type { Attribute, Common, Utils } from '@strapi/strapi';

export type PickTypes<T extends Attribute.Type> = T;

export type GetKeysByType<
  T extends Common.UID.Schema,
  U extends Attribute.Type,
  P = never
> = Utils.KeysBy<GetAll<T>, Attribute.Attribute<U> & Utils.NeverGuard<P, unknown>>;

export type GetByType<
  T extends Common.UID.Schema,
  U extends Attribute.Type,
  P = never
> = Utils.PickBy<GetAll<T>, Attribute.Attribute<U> & Utils.NeverGuard<P, unknown>>;

export type Get<T extends Common.UID.Schema, U extends GetKeys<T>> = Utils.Get<GetAll<T>, U>;

export type GetAll<T extends Common.UID.Schema> = Utils.Get<Common.Schemas[T], 'attributes'>;

export type GetKeys<T extends Common.UID.Schema> = keyof GetAll<T>;

export type GetValue<T extends Attribute.Attribute> =
  | Attribute.GetBigIntegerValue<T>
  | Attribute.GetBooleanValue<T>
  | Attribute.GetComponentValue<T>
  | Attribute.GetDecimalValue<T>
  | Attribute.GetDynamicZoneValue<T>
  | Attribute.GetEnumerationValue<T>
  | Attribute.GetEmailValue<T>
  | Attribute.GetFloatValue<T>
  | Attribute.GetIntegerValue<T>
  | Attribute.GetJsonValue<T>
  | Attribute.GetMediaValue<T>
  | Attribute.GetPasswordValue<T>
  | Attribute.GetRelationValue<T>
  | Attribute.GetRichTextValue<T>
  | Attribute.GetStringValue<T>
  | Attribute.GetTextValue<T>
  | Attribute.GetUIDValue<T>
  | Attribute.GetDateValue<T>
  | Attribute.GetDateTimeValue<T>
  | Attribute.GetTimeValue<T>
  | Attribute.GetTimestampValue<T>;

export type GetValueByKey<T extends Common.UID.Schema, U extends GetKeys<T>> = Get<
  T,
  U
> extends infer P
  ? P extends Attribute.Attribute
    ? GetValue<P>
    : never
  : never;

export type GetValues<T extends Common.UID.Schema, U extends GetKeys<T> = GetKeys<T>> = {
  // Handle required attributes
  [key in GetRequiredKeys<T> as key extends U ? key : never]-?: GetValueByKey<T, key>;
} & {
  // Handle optional attributes
  [key in GetOptionalKeys<T> as key extends U ? key : never]?: GetValueByKey<T, key>;
};

export type GetRequiredKeys<T extends Common.UID.Schema> = Utils.KeysBy<
  GetAll<T>,
  { required: true }
>;

export type GetOptionalKeys<T extends Common.UID.Schema> = keyof Omit<
  GetAll<T>,
  GetRequiredKeys<T>
>;
