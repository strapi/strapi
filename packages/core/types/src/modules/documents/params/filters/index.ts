import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type { Guard, If, And, MatchFirst, StrictEqual, IsNotNever } from '../../../../utils';

import type * as Operator from './operators';
import type * as AttributeUtils from '../attributes';
import type * as Params from '..';

export { Operator };

type IDKey = 'id';

/**
 * Filter representation for nested attributes
 */
type NestedAttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends Schema.AttributeNames<TSchemaUID>,
> = ObjectNotation<
  Guard.Never<
    Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TAttributeName>>,
    UID.Schema
  >
>;

/**
 * Filter representation for scalar attributes
 */
type AttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends IDKey | Schema.AttributeNames<TSchemaUID>,
> =
  MatchFirst<
    [
      // Special catch for manually added ID attributes
      [StrictEqual<TAttributeName, IDKey>, Params.Attribute.ID],
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
    ?
        | TAttributeValue // Implicit $eq operator
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
    ? // If both the scalar and nested keys are resolved, then create a strongly
      // typed filter object, else create a loose generic abstraction.
      If<
        And<IsNotNever<TScalarKeys>, IsNotNever<TNestedKeys>>,
        // Strongly typed representation of the filter object tree
        {
          [TIter in IDKey | TScalarKeys]?: AttributeCondition<TSchemaUID, TIter>;
        } & {
          [TIter in TNestedKeys]?: NestedAttributeCondition<TSchemaUID, TIter>;
        },
        // Generic representation of the filter object tree in case we don't have access to the attributes' list
        {
          [TKey in string]?:
            | AttributeCondition<TSchemaUID, never>
            | NestedAttributeCondition<TSchemaUID, never>;
        }
      >
    : never);

export type Any<TSchemaUID extends UID.Schema> = ObjectNotation<TSchemaUID>;
