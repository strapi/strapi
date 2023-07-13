import type { Attribute, Common, Utils } from '@strapi/strapi';

export type NonFilterableKind = Extract<Attribute.Kind, 'password' | 'dynamiczone'>;
export type FilterableKind = Exclude<Attribute.Kind, NonFilterableKind>;

export type GetNonFilterableKeys<TSchemaUID extends Common.UID.Schema> = Utils.Object.KeysBy<
  Attribute.GetAll<TSchemaUID>,
  Attribute.OfType<NonFilterableKind>
>;

export type GetScalarKeys<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetKeysByType<TSchemaUID, Attribute.NonPopulatableKind>,
  GetNonFilterableKeys<TSchemaUID>
>;

export type GetNestedKeys<TSchemaUID extends Common.UID.Schema> = Exclude<
  Attribute.GetKeysWithTarget<TSchemaUID>,
  GetNonFilterableKeys<TSchemaUID>
>;

export type BooleanValue = boolean | 'true' | 'false' | 't' | 'f' | '1' | '0' | 1 | 0;

export type NumberValue = string | number;

export type DateValue = Attribute.DateValue | number;

export type TimeValue = Attribute.TimeValue | number;

export type DateTimeValue = Attribute.DateTimeValue | number;

export type TimeStampValue = Attribute.TimestampValue;

/**
 * List of possible values for the scalar attributes
 * Uses the local GetValue to benefit from the values' overrides
 */
export type ScalarValues = GetValue<
  | Attribute.BigInteger
  | Attribute.Boolean
  | Attribute.DateTime
  | Attribute.Date
  | Attribute.Decimal
  | Attribute.Email
  | Attribute.Enumeration<string[]>
  | Attribute.Float
  | Attribute.Integer
  | Attribute.JSON
  // /!\  Password attributes are NOT filterable and should NOT be part of this union type.
  //      The member below has been commented on purpose to avoid adding it back without noticing.
  // | Attribute.Password
  | Attribute.RichText
  | Attribute.String
  | Attribute.Text
  | Attribute.Time
  | Attribute.Timestamp
  | Attribute.UID<Common.UID.Schema | undefined>
>;

/**
 * Attribute.GetValue override with filter values
 *
 * Fallback to unknown if never is found
 */
export type GetValue<TAttribute extends Attribute.Attribute> = Utils.Expression.If<
  Utils.Expression.IsNotNever<TAttribute>,
  Utils.Expression.MatchFirst<
    [
      // Boolean
      [Utils.Expression.Extends<TAttribute, Attribute.Boolean>, BooleanValue],
      // Number
      [
        Utils.Expression.Extends<
          TAttribute,
          Attribute.Integer | Attribute.BigInteger | Attribute.Float | Attribute.Decimal
        >,
        NumberValue
      ],
      // Date / Time
      [Utils.Expression.Extends<TAttribute, Attribute.Time>, TimeValue],
      [Utils.Expression.Extends<TAttribute, Attribute.Date>, DateValue],
      [
        Utils.Expression.Extends<TAttribute, Attribute.Timestamp | Attribute.DateTime>,
        DateTimeValue
      ],
      [
        Utils.Expression.Extends<
          TAttribute,
          Attribute.Relation<infer TOrigin, infer TRelationKind, infer TTarget>
        >,
        Attribute.RelationValue<TRelationKind, TTarget>
      ],
      // Fallback
      // If none of the above attribute type, fallback to the original Attribute.GetValue (while making sure it's an attribute)
      [Utils.Expression.True, Attribute.GetValue<TAttribute, unknown>]
    ],
    unknown
  >,
  unknown
>;
