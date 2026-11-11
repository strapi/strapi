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
 * When `TSchemaUID` is known, the type is `ObjectNotation<Target>`.
 *
 * Inside a component, the attribute also accepts one operator on the target's id
 * ({@link IdOperatorCondition}).
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
        IsComponent<TSchemaUID>,
        | (ObjectNotation<TTargetUID> & { [TIter in IdOperator]?: undefined })
        | IdOperatorCondition<TTargetUID>,
        ObjectNotation<TTargetUID>
      >
    : never;

/**
 * Filter on the id of a nested attribute's target: an object with exactly one comparison, list or
 * null operator (e.g. `{ $in: [1, 2] }`, `{ $null: true }`).
 *
 * The database applies it to the target's id. It throws for an object with several operators, or
 * with an operator next to other keys. So each operator object forbids the other operators and the
 * target's filter keys, and the filter object member forbids the id operators.
 *
 * The forbidden keys are optional `undefined` properties:
 * - They keep the type assignable to `ObjectNotation<Target>`, so reading a filter back keeps the
 *   target's keys. A bare id would break that, so it is not accepted: write `{ id: 5 }` or
 *   `{ $eq: 5 }`.
 * - They also hold without `strictNullChecks`. With `never`, TypeScript discards every member when it
 *   narrows the union on the `$null` key, and `{ $between: [1, 5] }` loses its tuple type.
 */
type IdOperatorCondition<TTargetUID extends UID.Schema> = {
  [TOperator in IdOperator]: { [TIter in TOperator]: IdOperatorValue<TOperator> } & {
    [TIter in Exclude<Operator.Where, TOperator> | FilterKeys<TTargetUID>]?: undefined;
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
          // while the UID is generic. `undefined`, not `never`: without strictNullChecks, the id
          // operator object (`documentId?: undefined`) would not be assignable to the component's
          // filter type, and reading a nested component filter back would fail.
          { [TIter in DocumentIDKey]?: undefined },
          unknown
        > &
          If<
            IsNotNever<TNestedKeys>,
            { [TIter in TNestedKeys]?: NestedAttributeCondition<TSchemaUID, TIter> },
            // Not an empty object type: intersected with `{}`, the filter type is no longer a weak type,
            // so TypeScript would accept an inferred filter (e.g. a direct `findMany` call) that has no
            // known key
            unknown
          >,
        // Generic representation of the filter object tree in case we don't have access to the attributes' list
        {
          [TKey in string]?:
            AttributeCondition<TSchemaUID, never> | NestedAttributeCondition<TSchemaUID, never>;
        }
      >
    : never);

export type Any<TSchemaUID extends UID.Schema> = ObjectNotation<TSchemaUID>;
