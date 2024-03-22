import type * as Public from '../public';
import type * as UID from '../uid';
import type { If, Object, Guard } from '../utils';

import type * as Attribute from './attribute';

export { Attribute };

/**
 * The Schemas type represents a combination of both content type and component schemas
 *
 * Both are fetched from the public registries.
 */
export type Schemas = Public.ContentTypeSchemas & Public.ComponentSchemas;

export type ContentTypes = Public.ContentTypeSchemas;

export type Components = Public.ComponentSchemas;

export type ContentType<TContentTypeUID extends UID.ContentType = UID.ContentType> =
  ContentTypes[TContentTypeUID];

export type Component<TComponentUID extends UID.Component = UID.Component> =
  Components[TComponentUID];

/**
 * Returns the Schema data structure associated with the given UID
 *
 * @template TSchemaUID - The unique identifier for the schema.
 */
export type Schema<TSchemaUID extends UID.Schema = UID.Schema> = Schemas[TSchemaUID];

/**
 * Returns the `info` property for a given schema.
 *
 * @template TSchemaUID - The targeted schema UID.
 */
export type Info<TSchemaUID extends UID.Schema> = Schema<TSchemaUID>['info'];

/**
 * Returns the `modelType` property for a given schema.
 *
 * @template TSchemaUID - The targeted schema UID.
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
  TAttributeName extends AttributeNames<TSchemaUID>
> = Attributes<TSchemaUID>[TAttributeName];

/**
 * Represents the value of an attribute based on its name
 *
 * @template TSchemaUID - The Schema's UID used to look for attributes.
 * @template TAttributeName - The name of the wanted attribute.
 */
export type AttributeValueByName<
  TSchemaUID extends UID.Schema,
  TAttributeName extends AttributeNames<TSchemaUID>
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

export type AttributesByType<
  TSchemaUID extends UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never
> = Object.PickBy<Attributes<TSchemaUID>, Attribute.OfType<TKind> & Guard.Never<TCondition>>;

export type AttributeNamesByType<
  TSchemaUID extends UID.Schema,
  TKind extends Attribute.Kind,
  TCondition = never
> = Object.KeysBy<
  Attributes<TSchemaUID>,
  Attribute.OfType<TKind> & Guard.Never<TCondition, unknown>,
  AttributeNames<TSchemaUID>
>;

export type NonPopulatableAttributeNames<TSchemaUID extends UID.Schema> = AttributeNamesByType<
  TSchemaUID,
  Attribute.NonPopulatableKind
>;

export type PopulatableAttributeNames<TSchemaUID extends UID.Schema> = AttributeNamesByType<
  TSchemaUID,
  Attribute.PopulatableKind
>;

export type AttributeNamesWithTarget<TSchemaUID extends UID.Schema> = Extract<
  Object.Values<{
    [TKey in AttributeNames<TSchemaUID>]: If<
      Attribute.HasTarget<AttributeByName<TSchemaUID, TKey>>,
      TKey
    >;
  }>,
  AttributeNames<TSchemaUID>
>;

export type RequiredAttributeNames<TSchemaUID extends UID.Schema> = Object.KeysBy<
  Attributes<TSchemaUID>,
  Attribute.Required,
  AttributeNames<TSchemaUID>
>;

export type OptionalAttributeNames<TSchemaUID extends UID.Schema> = Object.KeysExcept<
  Attributes<TSchemaUID>,
  Attribute.Required,
  AttributeNames<TSchemaUID>
>;
