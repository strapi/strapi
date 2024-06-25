import type { Attribute, Common, Utils } from '../../../../types';
import type { OmitRelationsWithoutTarget, RelationInputValue } from './relation';
import type { ID } from './id';
import type * as Literals from './literals';

export * from './id';
export * from './utils';
export * from './literals';

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
  | Attribute.Blocks
  | Attribute.JSON
  | Attribute.RichText
  | Attribute.String
  | Attribute.Text
  | Attribute.Time
  | Attribute.Timestamp
  | Attribute.UID<Common.UID.Schema>
  // /!\  Password attributes are NOT filterable and should NOT be part of this union type.
  //      The member below has been commented on purpose to avoid adding it back without noticing.
  // | Attribute.Password
>;

/**
 * Attribute.GetValues override with extended values
 */
export type GetValues<TSchemaUID extends Common.UID.Schema> = {
  id?: ID;
} & OmitRelationsWithoutTarget<
  TSchemaUID,
  {
    [TKey in Attribute.GetOptionalKeys<TSchemaUID>]?: GetValue<Attribute.Get<TSchemaUID, TKey>>;
  } & {
    [TKey in Attribute.GetRequiredKeys<TSchemaUID>]-?: GetValue<Attribute.Get<TSchemaUID, TKey>>;
  }
>;

/**
 * Attribute.GetValue override with extended values
 *
 * Fallback to unknown if never is found
 */
export type GetValue<
  TAttribute extends Attribute.Attribute,
  TGuard = unknown
> = Utils.Expression.If<
  Utils.Expression.IsNotNever<TAttribute>,
  Utils.Expression.MatchFirst<
    [
      // Relation
      [
        Utils.Expression.Extends<TAttribute, Attribute.OfType<'relation'>>,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        TAttribute extends Attribute.Relation<infer _TOrigin, infer TRelationKind, infer TTarget>
          ? Utils.Expression.If<
              Utils.Expression.IsNotNever<TTarget>,
              RelationInputValue<TRelationKind>
            >
          : never
      ],
      // DynamicZone
      [
        Utils.Expression.Extends<TAttribute, Attribute.OfType<'dynamiczone'>>,
        TAttribute extends Attribute.DynamicZone<infer TComponentsUIDs>
          ? Array<
              // Extract tuple values to a component uid union type
              Utils.Array.Values<TComponentsUIDs> extends infer TComponentUID
                ? TComponentUID extends Common.UID.Component
                  ? GetValues<TComponentUID> & { __component: TComponentUID }
                  : never
                : never
            >
          : never
      ],
      // Component
      [
        Utils.Expression.Extends<TAttribute, Attribute.OfType<'component'>>,
        TAttribute extends Attribute.Component<infer TComponentUID, infer TRepeatable>
          ? TComponentUID extends Common.UID.Component
            ? GetValues<TComponentUID> extends infer TValues
              ? Utils.Expression.If<TRepeatable, TValues[], TValues>
              : never
            : never
          : never
      ],
      // Boolean
      [Utils.Expression.Extends<TAttribute, Attribute.Boolean>, Literals.BooleanValue],
      // Number
      [
        Utils.Expression.Extends<
          TAttribute,
          Attribute.Integer | Attribute.BigInteger | Attribute.Float | Attribute.Decimal
        >,
        Literals.NumberValue
      ],
      // Date / Time
      [Utils.Expression.Extends<TAttribute, Attribute.Time>, Literals.TimeValue],
      [Utils.Expression.Extends<TAttribute, Attribute.Date>, Literals.DateValue],
      [
        Utils.Expression.Extends<TAttribute, Attribute.Timestamp | Attribute.DateTime>,
        Literals.DateTimeValue
      ],
      // Fallback
      // If none of the above attribute type, fallback to the original Attribute.GetValue (while making sure it's an attribute)
      [Utils.Expression.True, Attribute.GetValue<TAttribute, TGuard>]
    ],
    unknown
  >,
  unknown
>;
