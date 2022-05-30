import { Get, KeysBy, NeverGuard, PickBy, SchemaUID } from '../../utils';
import {
  Attribute,
  Type,
  GetBigIntegerAttributeValue,
  GetComponentAttributeValue,
  GetBooleanAttributeValue,
  GetDecimalAttributeValue,
  GetDynamicZoneAttributeValue,
  GetEnumerationAttributeValue,
  GetFloatAttributeValue,
  GetIntegerAttributeValue,
  GetJsonAttributeValue,
  GetMediaAttributeValue,
  GetPasswordAttributeValue,
  GetRelationAttributeValue,
  GetRichTextAttributeValue,
  GetStringAttributeValue,
  GetTextAttributeValue,
  GetUIDAttributeValue,
} from '.';

export type PickTypes<T extends Type> = T;

export type GetAttributesKeysByType<TUID extends SchemaUID, TType extends Type, TRule = never> = KeysBy<
  GetAttributes<TUID>,
  Attribute<TType> & NeverGuard<TRule, unknown>
>;

export type GetAttributesByType<TUID extends SchemaUID, TType extends Type, TRule = never> = PickBy<
  GetAttributes<TUID>,
  Attribute<TType> & NeverGuard<TRule, unknown>
>;

export type GetAttribute<T extends SchemaUID, U extends GetAttributesKey<T>> = Get<GetAttributes<T>, U>;

export type GetAttributes<T extends SchemaUID> = Get<Strapi.Schemas[T], 'attributes'>;

export type GetAttributesKey<T extends SchemaUID> = keyof GetAttributes<T>;

export type GetAttributeValue<T extends Attribute> =
  | GetBigIntegerAttributeValue<T>
  | GetBooleanAttributeValue<T>
  | GetComponentAttributeValue<T>
  | GetDecimalAttributeValue<T>
  | GetDynamicZoneAttributeValue<T>
  | GetEnumerationAttributeValue<T>
  | GetFloatAttributeValue<T>
  | GetIntegerAttributeValue<T>
  | GetJsonAttributeValue<T>
  | GetMediaAttributeValue<T>
  | GetPasswordAttributeValue<T>
  | GetRelationAttributeValue<T>
  | GetRichTextAttributeValue<T>
  | GetStringAttributeValue<T>
  | GetTextAttributeValue<T>
  | GetUIDAttributeValue<T>;

export type GetAttributeValueByKey<T extends SchemaUID, U extends GetAttributesKey<T>> = GetAttribute<T,  U
> extends infer P extends Attribute ? GetAttributeValue<P>:never;

export type GetAttributesValues<T extends SchemaUID> = {
  // Handle required attributes
  [key in GetAttributesRequiredKeys<T>]-?: GetAttributeValueByKey<T, key>;
} & {
  // Handle optional attributes
  [key in GetAttributesOptionalKeys<T>]?: GetAttributeValueByKey<T, key>;
};

export type GetAttributesRequiredKeys<T extends SchemaUID> = KeysBy<GetAttributes<T>, { required: true }>;
export type GetAttributesOptionalKeys<T extends SchemaUID> = keyof Omit<
  GetAttributes<T>,
  GetAttributesRequiredKeys<T>
>;
