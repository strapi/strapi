import type { Attribute, Common, Utils } from '@strapi/strapi';

import type * as Operator from './operators';
import type * as AttributeUtils from './attributes';

export { Operator, AttributeUtils as Attribute };

/**
 * Filter representation for nested attributes
 */
type NestedAttributeCondition<
  TSchemaUID extends Common.UID.Schema,
  TAttribute extends Attribute.GetKeys<TSchemaUID>
> = ObjectNotation<
  Utils.Guard.Never<Attribute.GetTarget<TSchemaUID, TAttribute>, Common.UID.Schema>
>;

/**
 * Filter representation for scalar attributes
 */
type AttributeCondition<
  TSchemaUID extends Common.UID.Schema,
  TAttribute extends Attribute.GetKeys<TSchemaUID>
> = Utils.Expression.If<
  Utils.Expression.IsNotNever<TAttribute>,
  // Get the filter attribute value for the given attribute
  AttributeUtils.GetValue<Attribute.Get<TSchemaUID, TAttribute>>,
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
          [TIter in Operator.Logical]?: AttributeCondition<TSchemaUID, TAttribute>;
        } & {
          [TIter in Operator.Group]?: AttributeCondition<TSchemaUID, TAttribute>[];
        })
  : never;

/**
 * Tree representation of a Strapi filter for a given schema UID
 */
export type ObjectNotation<TSchemaUID extends Common.UID.Schema> = {
  [TIter in Operator.Group]?: ObjectNotation<TSchemaUID>[];
} & {
  [TIter in Operator.Logical]?: ObjectNotation<TSchemaUID>;
} & ([AttributeUtils.GetScalarKeys<TSchemaUID>, AttributeUtils.GetNestedKeys<TSchemaUID>] extends [
    infer TScalarKeys extends AttributeUtils.GetScalarKeys<TSchemaUID>,
    infer TNestedKeys extends AttributeUtils.GetNestedKeys<TSchemaUID>
  ]
    ? // If both the scalar and nested keys are resolved, then create a strongly
      // typed filter object, else create a loose generic abstraction.
      Utils.Expression.If<
        Utils.Expression.And<
          Utils.Expression.IsNotNever<TScalarKeys>,
          Utils.Expression.IsNotNever<TNestedKeys>
        >,
        // Strongly typed representation of the filter object tree
        | { [TIter in TScalarKeys]?: AttributeCondition<TSchemaUID, TIter> }
        | { [TIter in TNestedKeys]?: NestedAttributeCondition<TSchemaUID, TIter> },
        // Generic representation of the filter object tree in case we don't have access to the attributes' list
        | { [TKey in string]?: AttributeCondition<TSchemaUID, never> }
        | { [TKey in string]?: NestedAttributeCondition<TSchemaUID, never> }
      >
    : never);

export type Any<TSchemaUID extends Common.UID.Schema> = ObjectNotation<TSchemaUID>;
