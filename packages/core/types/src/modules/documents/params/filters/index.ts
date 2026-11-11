import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type {
  Guard,
  If,
  And,
  MatchFirst,
  StrictEqual,
  IsNotNever,
  DoesNotExtends,
} from '../../../../utils';

import type * as Operator from './operators';
import type * as AttributeUtils from '../attributes';
import type * as Params from '..';

export { Operator };

type IDKey = 'id';
type DocumentIDKey = 'documentId';

/**
 * Filter representation for nested attributes
 *
 * The target UID is resolved through `infer` before recursing. When `TSchemaUID` is a type
 * parameter, the conditional type stays deferred, so TypeScript does not build an endless chain of
 * new `ObjectNotation<Target<...>>` instantiations, which would exhaust the heap on nested filters.
 * When the target's attributes are known, the type is the target's filter object, or one operator on
 * the target's id ({@link IdOperatorCondition}). Otherwise it is the target's loose filter object.
 */
type NestedAttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends Schema.AttributeNames<TSchemaUID>,
> =
  Guard.Never<
    Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TAttributeName>>,
    UID.Schema
  > extends infer TTargetUID extends UID.Schema
    ? If<
        HasKnownAttributeNames<TTargetUID>,
        ObjectNotation<TTargetUID> | IdOperatorCondition<TTargetUID>,
        // The loose filter of an unknown target already accepts any operator. A union with the
        // operator objects would make TypeScript narrow on the operator key and drop it.
        ObjectNotation<TTargetUID>
      >
    : never;

/**
 * Filter on the id of a nested attribute's target: an object with exactly one comparison, list or
 * null operator (e.g. `{ $in: [1, 2] }`, `{ $null: true }`).
 *
 * The database applies it to the target's id. It throws for an object with several operators, or
 * with an operator next to other keys. So each operator object forbids the other operators and the
 * target's filter keys. A literal that mixes an operator with other keys matches no member.
 *
 * The filter object member does not forbid the operators, so spreading a filter read back from it
 * and adding a key (`{ ...filters.article, title: 'a' }`) compiles. The spread compiles even when the
 * value holds an operator object, and the database then throws. For the same reason, an operator next
 * to other keys is rejected only in a literal: through a variable (`{ $in: ids, title }` with
 * `title?: string`), a conditional or a spread it compiles, and the database throws. Write
 * `{ id: { $in: ids }, title }` instead.
 *
 * The forbidden keys are optional {@link Forbidden} properties, so the type stays assignable to
 * `ObjectNotation<Target>` and reading a filter back keeps the target's keys. A bare id would break
 * that, so it is not accepted: write `{ id: 5 }` or `{ $eq: 5 }`.
 */
type IdOperatorCondition<TTargetUID extends UID.Schema> = {
  [TOperator in IdOperator]: { [TIter in TOperator]: IdOperatorValue<TOperator> } & {
    [TIter in Exclude<Operator.Where, TOperator> | FilterKeys<TTargetUID>]?: Forbidden;
  };
}[IdOperator];

/**
 * Operators that make sense on an id. Text operators (e.g. `$contains`) are left out.
 */
type IdOperator =
  | '$eq'
  | '$ne'
  | '$lt'
  | '$lte'
  | '$gt'
  | '$gte'
  | '$in'
  | '$notIn'
  | '$between'
  | Operator.BooleanValue;

type IdOperatorValue<TOperator extends IdOperator> = TOperator extends Operator.BooleanValue
  ? boolean
  : TOperator extends Operator.DynamicArrayValue
    ? Params.Attribute.ID[]
    : TOperator extends Operator.DynamicBoundValue
      ? [Params.Attribute.ID, Params.Attribute.ID]
      : Params.Attribute.ID;

/**
 * Non-operator keys of the filter object of {@link TSchemaUID}, plus its groups and `$not`
 */
type FilterKeys<TSchemaUID extends UID.Schema> =
  | Operator.Group
  | Operator.Logical
  | IDKey
  | DocumentIDKey
  | If<HasKnownAttributeNames<TSchemaUID>, Schema.AttributeNames<TSchemaUID>, never>;

/**
 * Filter representation for scalar attributes
 */
type AttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends IDKey | DocumentIDKey | Schema.AttributeNames<TSchemaUID>,
> =
  MatchFirst<
    [
      // Special catch for manually added ID attributes
      [StrictEqual<TAttributeName, IDKey>, Params.Attribute.ID],
      [StrictEqual<TAttributeName, DocumentIDKey>, Params.Attribute.DocumentID],
      [
        IsNotNever<TAttributeName>,
        // Get the filter attribute value for the given attribute
        AttributeUtils.GetValue<
          Schema.AttributeByName<
            TSchemaUID,
            Extract<TAttributeName, Schema.AttributeNames<TSchemaUID>>
          >
        >,
      ],
    ],
    // Fallback to the list of all possible scalar attributes' value if the attribute is not valid (never)
    AttributeUtils.ScalarValues
  > extends infer TAttributeValue
    ? | TAttributeValue // Implicit $eq operator
      | ({
          [TIter in Operator.BooleanValue]?: boolean;
        } & {
          [TIter in Operator.DynamicValue]?: TAttributeValue;
        } & {
          [TIter in Operator.DynamicArrayValue]?: TAttributeValue[];
        } & {
          [TIter in Operator.DynamicBoundValue]?: [TAttributeValue, TAttributeValue];
        } & {
          [TIter in Operator.Logical]?: AttributeCondition<TSchemaUID, TAttributeName>;
        } & {
          [TIter in Operator.Group]?: AttributeCondition<TSchemaUID, TAttributeName>[];
        })
    : never;

/**
 * Whether the attribute names of {@link TSchemaUID} are a finite list of names.
 *
 * Checks the attribute names rather than the scalar and nested keys: a schema can have only scalar
 * or only nested attributes, so either list can be empty for a known schema.
 *
 * The names are unknown (`string`) when the schema registries are not extended (no generated types)
 * or when the UID is not in the registries. They are `never` for a union of UIDs whose schemas share
 * no attribute.
 */
type HasKnownAttributeNames<TSchemaUID extends UID.Schema> = And<
  IsNotNever<Schema.AttributeNames<TSchemaUID>>,
  DoesNotExtends<string, Schema.AttributeNames<TSchemaUID>>
>;

type IsComponent<TSchemaUID extends UID.Schema> = StrictEqual<
  Schema.ModelType<TSchemaUID>,
  'component'
>;

/**
 * Value type of a key that a filter object forbids: `undefined` without `strictNullChecks`, `never`
 * with it.
 *
 * - Without `strictNullChecks`, TypeScript narrows the id operator union on the `$null` key and
 *   compares a missing key (`undefined`) with each member. With `never`, it discards every member and
 *   `{ $between: [1, 5] }` loses its tuple type. A component filter (`documentId`) and the id operator
 *   object must also forbid keys the same way, or the operator object is not assignable to the
 *   component filter and reading a nested component filter back fails.
 * - With `exactOptionalPropertyTypes`, `?: undefined` is a key that can be present, so a filter
 *   object member with `$in?: undefined` is not assignable to the target's filter and reading a
 *   nested filter back fails. `?: never` keeps it assignable.
 */
type Forbidden = null extends string ? undefined : never;

/**
 * Tree representation of a Strapi filter for a given schema UID
 */
export type ObjectNotation<TSchemaUID extends UID.Schema> = {
  [TIter in Operator.Group]?: ObjectNotation<TSchemaUID>[];
} & {
  [TIter in Operator.Logical]?: ObjectNotation<TSchemaUID>;
} & ([AttributeUtils.GetScalarKeys<TSchemaUID>, AttributeUtils.GetNestedKeys<TSchemaUID>] extends [
    infer TScalarKeys extends AttributeUtils.GetScalarKeys<TSchemaUID>,
    infer TNestedKeys extends AttributeUtils.GetNestedKeys<TSchemaUID>,
  ]
    ? // If the schema's attribute names are known, then create a strongly typed filter object, else
      // create a loose generic abstraction.
      If<
        HasKnownAttributeNames<TSchemaUID>,
        // Strongly typed representation of the filter object tree
        {
          [TIter in IDKey | DocumentIDKey | TScalarKeys]?: AttributeCondition<TSchemaUID, TIter>;
        } & If<
          IsComponent<TSchemaUID>,
          // Components have no documentId. The key stays in the mapped type above, so it resolves
          // while the UID is generic.
          { [TIter in DocumentIDKey]?: Forbidden },
          unknown
        > & {
            // `id` is always one of the keys, so this object type is never empty. An empty object type
            // (`{}`) in the intersection would stop the filter from being a weak type, and TypeScript
            // would accept an inferred filter (e.g. a direct `findMany` call) that has no known key.
            // A conditional around the whole object would avoid `{}` too, but then a filter for a
            // generic UID would no longer be assignable to the filter of the wide UID.
            [TIter in IDKey | TNestedKeys]?: TIter extends TNestedKeys
              ? NestedAttributeCondition<TSchemaUID, TIter>
              : unknown;
          },
        // Generic representation of the filter object tree in case we don't have access to the attributes' list
        {
          [TKey in string]?:
            AttributeCondition<TSchemaUID, never> | NestedAttributeCondition<TSchemaUID, never>;
        }
      >
    : never);

export type Any<TSchemaUID extends UID.Schema> = ObjectNotation<TSchemaUID>;
