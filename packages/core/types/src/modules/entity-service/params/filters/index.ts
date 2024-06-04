import type * as Schema from '../../../../schema';

import type * as UID from '../../../../uid';
import type {
  Constants,
  Guard,
  Cast,
  If,
  MatchFirst,
  StrictEqual,
  IsNotNever,
} from '../../../../utils';

import type * as Operator from './operators';
import type * as AttributeUtils from '../attributes';
import type * as Params from '..';

export { Operator };

type IDKey = 'id';

/**
 * Generic object notation for filters.
 * @template TSchemaUID The type of the schema UID for the object notation.
 */
export type Any<TSchemaUID extends UID.Schema> = ObjectNotation<TSchemaUID>;

/**
 * Type that unites root-level operators and attributes filtering for a specific schema query.
 *
 * It is used to define the structure of filters objects in a specific schema.
 * @template TSchemaUID The UID of the schema defining the object notation.
 */
export type ObjectNotation<TSchemaUID extends UID.Schema> = TSchemaUID extends infer TUIDs extends
  UID.Schema
  ? // The intermediary mapping step below allows TypeScript's generic inference to correctly distribute the
    // TSchemaUID union into the individual keys of AttributesFiltering and RootLevelOperatorFiltering types
    {
      [TUID in TUIDs]: RootLevelOperatorFiltering<TUID> & AttributesFiltering<TUID>;
    }[TSchemaUID]
  : never;

/**
 * Object for root level operator filtering.
 * @template TSchemaUID - The type of the schema UID.
 */
export type RootLevelOperatorFiltering<TSchemaUID extends UID.Schema> = {
  [TIter in Operator.Group]?: ObjectNotation<TSchemaUID>[];
} & {
  [TIter in Operator.Logical]?: ObjectNotation<TSchemaUID>;
};

/**
 * Represents a type for filtering on attributes based on a given schema.
 *  @template TSchemaUID - The UID of the schema.
 */
export type AttributesFiltering<TSchemaUID extends UID.Schema> =
  // Manually added filtering on virtual ID attribute
  IDFiltering &
    If<
      Constants.AreSchemaRegistriesExtended,
      // Combines filtering for scalar and nested attributes based on schema UID
      ScalarAttributesFiltering<TSchemaUID> & NestedAttributeFiltering<TSchemaUID>,
      // Abstract representation of the filter object tree in case we don't have access to the attributes' list
      AbstractAttributesFiltering<TSchemaUID>
    >;
/**
 * Definition of scalar attribute filtering for a given schema UID.
 * @template TSchemaUID - The UID of the schema.
 */
export type ScalarAttributesFiltering<TSchemaUID extends UID.Schema> = {
  [TKey in AttributeUtils.GetScalarKeys<TSchemaUID>]?: AttributeCondition<TSchemaUID, TKey>;
};

/**
 * Filters object for nested schema attributes.
 * @template TSchemaUID - The UID of the schema to perform filtering on.
 */
export type NestedAttributeFiltering<TSchemaUID extends UID.Schema> = {
  [TKey in AttributeUtils.GetNestedKeys<TSchemaUID>]?: ObjectNotation<
    Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TKey>>
  >;
};

type IDFiltering = { id?: AttributeCondition<never, IDKey> };

/**
 * Filter condition for scalar attributes.
 * @template TSchemaUID - The unique identifier of the schema.
 * @template TAttributeName - The name of the attribute.
 */
type AttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends IDKey | AttributeUtils.GetScalarKeys<TSchemaUID>,
> =
  GetScalarAttributeValue<TSchemaUID, TAttributeName> extends infer TAttributeValue
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
 * Utility type that retrieves the value of a scalar attribute in a schema.
 * @template TSchemaUID The UID type of the schema.
 * @template TAttributeName The name of the attribute.
 */
type GetScalarAttributeValue<
  TSchemaUID extends UID.Schema,
  TAttributeName extends IDKey | AttributeUtils.GetScalarKeys<TSchemaUID>,
> = MatchFirst<
  [
    // Checks and captures for manually added ID attributes
    [StrictEqual<TAttributeName, IDKey>, Params.Attribute.ID],
    [
      // Ensure attribute name isn't 'never'
      IsNotNever<TAttributeName>,
      // Get value of specific attribute in the schema
      AttributeUtils.GetValue<
        Schema.AttributeByName<
          TSchemaUID,
          // Cast attribute name to a scalar key if possible
          Cast<TAttributeName, AttributeUtils.GetScalarKeys<TSchemaUID>>
        >
      >,
    ],
  ],
  // Fallback to the list of all possible scalar attributes' value if the attribute is not valid (never)
  AttributeUtils.ScalarValues
>;

/**
 * Nested filter condition based on the given schema and attribute name
 * @template TSchemaUID - The (literal) UID of the schema.
 * @template TAttributeName - The attribute name in the schema.
 */
type NestedAttributeCondition<
  TSchemaUID extends UID.Schema,
  TAttributeName extends Schema.AttributeNames<TSchemaUID>,
> = ObjectNotation<
  // Ensure the resolved target isn't `never`, else, fallback to UID.Schema
  Guard.Never<
    Schema.Attribute.Target<Schema.AttributeByName<TSchemaUID, TAttributeName>>,
    UID.Schema
  >
>;

export type AbstractAttributesFiltering<TSchemaUID extends UID.Schema> = {
  [TKey in string]?:
    | AttributeCondition<TSchemaUID, never>
    | NestedAttributeCondition<TSchemaUID, never>;
};
