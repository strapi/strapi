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
 * When `TSchemaUID` is known, the type is the same as `ObjectNotation<Target>`.
 */
type NestedAttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends Schema.AttributeNames<TSchemaUID>,
> =
  Guard.Never<
    Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TAttributeName>>,
    UID.Schema
  > extends infer TTargetUID extends UID.Schema
    ? ObjectNotation<TTargetUID>
    : never;

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

/**
 * Identifier keys a filter accepts on top of the schema's attributes. Components have no documentId.
 */
type IdentifierKeys<TSchemaUID extends UID.Schema> = If<
  StrictEqual<Schema.ModelType<TSchemaUID>, 'component'>,
  IDKey,
  IDKey | DocumentIDKey
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
          [TIter in IdentifierKeys<TSchemaUID> | TScalarKeys]?: AttributeCondition<
            TSchemaUID,
            TIter
          >;
        } & If<
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
