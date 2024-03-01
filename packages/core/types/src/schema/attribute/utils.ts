import type * as UID from '../../uid';
import type { Constants, Guard, And, Extends, IsNotNever } from '../../utils';
import type { Attribute } from '../../schema';

/**
 * Determines if a given attribute type is of a specific kind.
 *
 * @template TAttribute - The attribute type to check.
 * @template TKind - The kind of attribute to compare against.
 */
export type IsOfType<
  TAttribute extends Attribute.Attribute,
  TKind extends Attribute.Kind
> = TAttribute extends {
  type: TKind;
}
  ? true
  : false;

/**
 * Checks whether a given Attribute {@link TAttribute} is populatable.
 *
 * @template TAttribute - The attribute to check.
 *
 * @see {@link PopulatableKind} for more information about populatable attributes.
 */
export type IsPopulatable<TAttribute extends Attribute.Attribute> = IsOfType<
  TAttribute,
  Attribute.PopulatableKind
>;

/**
 * Returns the type (as {@link Kind}) of a given attribute.
 *
 * @template TAttribute - Any attribute
 */
export type TypeOf<TAttribute extends Attribute.Attribute> = TAttribute['type'];

export type Target<TAttribute extends Attribute.Attribute> =
  | Attribute.RelationTarget<TAttribute>
  | Attribute.ComponentTarget<TAttribute>
  | Attribute.MediaTarget<TAttribute>;

export type MorphTargets<TAttribute extends Attribute.Attribute> =
  Attribute.DynamicZoneTargets<TAttribute>;

export type HasTarget<TAttribute extends Attribute.Attribute> =
  Target<TAttribute> extends infer TTarget
    ? And<IsNotNever<TTarget>, Extends<TTarget, UID.Schema>>
    : Constants.False;

export type HasMorphTargets<TAttribute extends Attribute.Attribute> =
  MorphTargets<TAttribute> extends infer TMaybeTargets
    ? And<IsNotNever<TMaybeTargets>, Extends<TMaybeTargets, UID.Schema>>
    : Constants.False;

/**
 * Represents the actual value of a given attribute {@link TAttribute}.
 *
 * @template TAttribute - The attribute to extract the value from.
 */
export type Value<TAttribute extends Attribute.Attribute, TGuard = unknown> = Guard.Never<
  {
    // Scalar
    biginteger: Attribute.GetBigIntegerValue<TAttribute>;
    boolean: Attribute.GetBooleanValue<TAttribute>;
    blocks: Attribute.GetBlocksValue<TAttribute>;
    decimal: Attribute.GetDecimalValue<TAttribute>;
    enumeration: Attribute.GetEnumerationValue<TAttribute>;
    email: Attribute.GetEmailValue<TAttribute>;
    float: Attribute.GetFloatValue<TAttribute>;
    integer: Attribute.GetIntegerValue<TAttribute>;
    json: Attribute.GetJsonValue<TAttribute>;
    password: Attribute.GetPasswordValue<TAttribute>;
    richtext: Attribute.GetRichTextValue<TAttribute>;
    string: Attribute.GetStringValue<TAttribute>;
    text: Attribute.GetTextValue<TAttribute>;
    uid: Attribute.GetUIDValue<TAttribute>;
    date: Attribute.GetDateValue<TAttribute>;
    datetime: Attribute.GetDateTimeValue<TAttribute>;
    time: Attribute.GetTimeValue<TAttribute>;
    timestamp: Attribute.GetTimestampValue<TAttribute>;
    // Populatable
    component: Attribute.GetComponentValue<TAttribute>;
    dynamiczone: Attribute.GetDynamicZoneValue<TAttribute>;
    media: Attribute.GetMediaValue<TAttribute>;
    relation: Attribute.GetRelationValue<TAttribute>;
  }[Attribute.TypeOf<TAttribute>],
  TGuard
>;
