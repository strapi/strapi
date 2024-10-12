import type * as Public from '../public';
import type * as UID from '../uid';
import type { If, Object, Guard } from '../utils';

import type * as Attribute from './attribute';

export { Attribute };

/**
 * Combines both content type and component schemas, effectively serving as a consolidated registry of all schemas.
 *
 * Enables mapping between a unique identifier and its corresponding schema.
 *
 @remark Schema definitions are pulled from the public registries
 */
export type Schemas = Public.ContentTypeSchemas & Public.ComponentSchemas;

/**
 * Content-type schema definitions.
 *
 * @remark Schema definitions are pulled from the public content-type registries
 */
export type ContentTypes = Public.ContentTypeSchemas;

/**
 * Component schema definitions.
 *
 * @remark Schema definitions are pulled from the public component registries
 */
export type Components = Public.ComponentSchemas;

export type ContentType<TContentTypeUID extends UID.ContentType = UID.ContentType> =
  ContentTypes[TContentTypeUID];

export type Component<TComponentUID extends UID.Component = UID.Component> =
  Components[TComponentUID];

/**
 * Returns the Schema data structure associated with the given UID
 *
 * @template TSchemaUID - The unique identifier for the schema.
 *
 * @see Schemas
 */
export type Schema<TSchemaUID extends UID.Schema = UID.Schema> = Schemas[TSchemaUID];

/**
 * Returns the `info` property for a given schema.
 *
 * @template TSchemaUID - The targeted schema UID.
 *
 * @see Schema
 */
export type Info<TSchemaUID extends UID.Schema> = Schema<TSchemaUID>['info'];

/**
 * Returns the `modelType` property for a given schema.
 *
 * @template TSchemaUID - The targeted schema UID.
 *
 * @see Schema
 */
export type ModelType<TSchemaUID extends UID.Schema> = Schema<TSchemaUID>['modelType'];

/**
 * Returns the attribute {@link TAttributeName} from {@link TSchemaUID}'s attributes.
 *
 * @template TSchemaUID - The Schema's UID used to look for attributes.
 * @template TAttributeName - The name of the wanted attribute.
 */
export type AttributeByName<
  TSchemaUID extends UID.Schema,
  TAttributeName extends AttributeNames<TSchemaUID>,
> = Attributes<TSchemaUID>[TAttributeName];

/**
 * Represents the value of an attribute based on its name
 *
 * @template TSchemaUID - The Schema's UID used to look for attributes.
 * @template TAttributeName - The name of the wanted attribute.
 */
export type AttributeValueByName<
  TSchemaUID extends UID.Schema,
  TAttributeName extends AttributeNames<TSchemaUID>,
> = Attribute.Value<AttributeByName<TSchemaUID, TAttributeName>>;

/**
 * Returns an object containing every attribute within {@link TSchemaUID}.
 *
 * @template TSchemaUID - The Schema's UID used to get its attributes
 */
export type Attributes<TSchemaUID extends UID.Schema = UID.Schema> = {
  [TUID in TSchemaUID]: Schema<TSchemaUID>['attributes'];
}[TSchemaUID];

/**
 * Union type of every attribute name within {@link TSchemaUID}'s attributes
 *
 * @template TSchemaUID - The Schema's UID used to get the attributes names.
 */
export type AttributeNames<TSchemaUID extends UID.Schema> = Extract<
  keyof Attributes<TSchemaUID>,
  string
>;

/**
 * Create an attribute record whose types matches the given ones.
 *
 * @template TSchemaUID - The Schema's UID used to get the attribute names.
 * @template TKind - The kind of attribute we are searching for.
 * @template TCondition - Optional. An additional condition to match additional attributes properties.
 */
export type AttributesByType<
  TSchemaUID extends UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never,
> = Object.PickBy<Attributes<TSchemaUID>, Attribute.OfType<TKind> & Guard.Never<TCondition>>;

/**
 * Returns a union of attribute names whose type matches the given ones.
 *
 * @template TSchemaUID - The Schema's UID used to get the attribute names.
 * @template TKind - The kind of attribute we are searching for.
 * @template TCondition - Optional. An additional condition to match additional attributes properties.
 */
export type AttributeNamesByType<
  TSchemaUID extends UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never,
> = Object.KeysBy<
  Attributes<TSchemaUID>,
  Attribute.OfType<TKind> & Guard.Never<TCondition, unknown>,
  AttributeNames<TSchemaUID>
>;

/**
 * Provides the names of non-populatable attributes of a Schema.
 *
 * Non-populatable attributes are those which do not need to be populated to get their final value.
 *
 * @template TSchemaUID - The unique identifier of the schema.
 */
export type NonPopulatableAttributeNames<TSchemaUID extends UID.Schema> = AttributeNamesByType<
  TSchemaUID,
  Attribute.NonPopulatableKind
>;

/**
 * Provides the names of populatable attributes of a Schema.
 *
 * Populatable attributes are those which need to be populated to get their final value, such as {@link Attribute.Relation}, {@link Attribute.DynamicZone}, {@link Attribute.Component} or {@link Attribute.Media}.
 *
 * @template TSchemaUID - The unique identifier of the schema.
 */
export type PopulatableAttributeNames<TSchemaUID extends UID.Schema> = AttributeNamesByType<
  TSchemaUID,
  Attribute.PopulatableKind
>;

/**
 * Returns a list of attribute names which have associated targets.
 *
 * @remark `
 AttributeNamesWithTarget` maps over the list of attribute for a given schema and filters those
 * with targets (in other words, attribute names that have associated {@link Attribute.HasTarget} true).
 *
 * @returns a union of each attribute's name matching the condition.
 *
 * @template TSchemaUID - The unique identifier of the schema.
 */
export type AttributeNamesWithTarget<TSchemaUID extends UID.Schema> = Extract<
  Object.Values<{
    [TKey in AttributeNames<TSchemaUID>]: If<
      Attribute.HasTarget<AttributeByName<TSchemaUID, TKey>>,
      TKey
    >;
  }>,
  AttributeNames<TSchemaUID>
>;

/**
 * Extracts the names of all required attributes from a given schema.
 *
 * @remark `RequiredAttributeNames` screens attributes based on the {@link Attribute.Required} property,
 * determining mandatory attributes from the given schema.
 *
 * @template TSchemaUID - The identifier of the schema.
 */
export type RequiredAttributeNames<TSchemaUID extends UID.Schema> = Object.KeysBy<
  Attributes<TSchemaUID>,
  Attribute.Required,
  AttributeNames<TSchemaUID>
>;

/**
 * Returns a union of every optional attribute name by excluding required attribute keys from the given Schema UID.
 *
 * @remark The `
 OptionalAttributeNames` type utilises the {@link Object.KeysExcept} utility that takes a Schema's attributes and excludes the keys of required attributes.
 *
 * @template TSchemaUID - The unique identifier for the schema.
 */
export type OptionalAttributeNames<TSchemaUID extends UID.Schema> = Object.KeysExcept<
  Attributes<TSchemaUID>,
  Attribute.Required,
  AttributeNames<TSchemaUID>
>;
