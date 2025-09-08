import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type {
  Array,
  Constants,
  Object,
  If,
  Extends,
  MatchFirst,
  IsNotNever,
} from '../../../../utils';

import type { ID, DocumentID } from './id';
import type { OmitRelationsWithoutTarget, RelationInputValue } from './relations';

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

export type BooleanValue = boolean | 'true' | 'false' | 't' | 'f' | '1' | '0' | 1 | 0;

export type NumberValue = string | number;

export type DateValue = Schema.Attribute.DateValue | number;

export type TimeValue = Schema.Attribute.TimeValue | number;

export type DateTimeValue = Schema.Attribute.DateTimeValue | number;

export type TimeStampValue = Schema.Attribute.TimestampValue;

/**
 * List of possible values for the scalar attributes
 * Uses the local GetValue to benefit from the values' overrides
 */
export type ScalarValues = GetValue<
  | Schema.Attribute.BigInteger
  | Schema.Attribute.Boolean
  | Schema.Attribute.DateTime
  | Schema.Attribute.Date
  | Schema.Attribute.Decimal
  | Schema.Attribute.Email
  | Schema.Attribute.Enumeration<string[]>
  | Schema.Attribute.Float
  | Schema.Attribute.Integer
  | Schema.Attribute.Blocks
  | Schema.Attribute.JSON
  // /!\  Password attributes are NOT filterable and should NOT be part of this union type.
  //      The member below has been commented on purpose to avoid adding it back without noticing.
  // | Schema.Attribute.Password
  | Schema.Attribute.RichText
  | Schema.Attribute.String
  | Schema.Attribute.Text
  | Schema.Attribute.Time
  | Schema.Attribute.Timestamp
  | Schema.Attribute.UID
>;

/**
 * Attribute.GetValues override with extended values
 */
export type GetValues<TSchemaUID extends UID.Schema> = {
  id?: ID;
  documentId?: DocumentID;
} & OmitRelationsWithoutTarget<
  TSchemaUID,
  {
    [TKey in Schema.OptionalAttributeNames<TSchemaUID>]?: GetValue<
      Schema.AttributeByName<TSchemaUID, TKey>
    >;
  } & {
    [TKey in Schema.RequiredAttributeNames<TSchemaUID>]-?: GetValue<
      Schema.AttributeByName<TSchemaUID, TKey>
    >;
  }
>;

/**
 * Attribute.GetValue override with extended values
 *
 * Fallback to unknown if never is found
 */
export type GetValue<TAttribute extends Schema.Attribute.Attribute> = If<
  IsNotNever<TAttribute>,
  MatchFirst<
    [
      // Relation
      [
        Extends<TAttribute, Schema.Attribute.OfType<'relation'>>,
        TAttribute extends Schema.Attribute.RelationWithTarget
          ? RelationInputValue<TAttribute['relation']>
          : never,
      ],
      // DynamicZone
      [
        Extends<TAttribute, Schema.Attribute.OfType<'dynamiczone'>>,
        TAttribute extends Schema.Attribute.DynamicZone<infer TComponentsUIDs>
          ? Array<
              // Extract tuple values to a component uid union type
              Array.Values<TComponentsUIDs> extends infer TComponentUID
                ? TComponentUID extends UID.Component
                  ? GetValues<TComponentUID> & { __component: TComponentUID }
                  : never
                : never
            >
          : never,
      ],
      // Component
      [
        Extends<TAttribute, Schema.Attribute.OfType<'component'>>,
        TAttribute extends Schema.Attribute.Component<infer TComponentUID, infer TRepeatable>
          ? TComponentUID extends UID.Component
            ? GetValues<TComponentUID> extends infer TValues
              ? If<TRepeatable, TValues[], TValues>
              : never
            : never
          : never,
      ],
      // Boolean
      [Extends<TAttribute, Schema.Attribute.Boolean>, BooleanValue],
      // Number
      [
        Extends<
          TAttribute,
          | Schema.Attribute.Integer
          | Schema.Attribute.BigInteger
          | Schema.Attribute.Float
          | Schema.Attribute.Decimal
        >,
        NumberValue,
      ],
      // Date / Time
      [Extends<TAttribute, Schema.Attribute.Time>, TimeValue],
      [Extends<TAttribute, Schema.Attribute.Date>, DateValue],
      [Extends<TAttribute, Schema.Attribute.Timestamp | Schema.Attribute.DateTime>, DateTimeValue],
      // Fallback
      // If none of the above attribute type, fallback to the original Attribute.GetValue (while making sure it's an attribute)
      [Constants.True, Schema.Attribute.Value<TAttribute>],
    ],
    unknown
  >,
  unknown
>;

// Re-export useful types

export type { ID, DocumentID };
