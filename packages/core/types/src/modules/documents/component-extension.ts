import type { UID, Schema, Utils } from '../..';
import type { Input, PartialInput } from './params/data';
import type * as AttributeUtils from './params/attributes';

/**
 * Defines the structure of component bodies based on the given schema UID and component-like keys.
 *
 * It adapts based on whether schema registries have been extended, either mapping attribute names to
 * their respective values or using a generic key-value structure if the registries have not been extended.
 *
 * @template TSchemaUID - The schema's UID, extending from {@link UID.Schema}, which determines the attribute names and types to use.
 * @template TComponentLikeKeys - A string type representing the keys to keep that are component-like, defaults to a generic string.
 *
 * @example
 * Using `ComponentBody` in a situation where the schema registries have been extended:
 * ```typescript
 * type MyComponentSchemaUID = 'default.mycomponent';
 * type MyComponentBody = ComponentBody<MyComponentSchemaUID, 'header' | 'footer'>;
 *
 * // This resolves to:
 * // {
 * //   header: AttributeUtils.GetValue<Schema.AttributeByName<MyComponentSchemaUID, 'header'>>;
 * //   footer: AttributeUtils.GetValue<Schema.AttributeByName<MyComponentSchemaUID, 'footer'>>;
 * // }
 * ```
 *
 * In cases where it's unknown whether schema registries have been extended:
 * ```typescript
 * type GenericComponentBody = ComponentBody<UID.Schema>;
 *
 * // This resolves to:
 * // {
 * //   [key: string]: AttributeUtils.GetValue<
 * //     | Schema.Attribute.Component<UID.Component, false>
 * //     | Schema.Attribute.Component<UID.Component, true>
 * //     | Schema.Attribute.DynamicZone
 * //   >;
 * // }
 * ```
 *
 * @todo: Move to common data structures and make it available for other use
 */
type ComponentBody<
  TSchemaUID extends UID.Schema = UID.Schema,
  TComponentLikeKeys extends string = string,
> = Utils.If<
  Utils.Constants.AreSchemaRegistriesExtended,
  {
    [TAttributeName in Extract<
      Schema.AttributeNamesByType<TSchemaUID, 'component' | 'dynamiczone'>,
      TComponentLikeKeys
    >]: AttributeUtils.GetValue<Schema.AttributeByName<TSchemaUID, TAttributeName>>;
  },
  {
    [key: string]: AttributeUtils.GetValue<
      | Schema.Attribute.Component<UID.Component, false>
      | Schema.Attribute.Component<UID.Component, true>
      | Schema.Attribute.DynamicZone
    >;
  }
>;

/**
 * Provides methods to manipulate component data in input payloads.
 *
 * @template TSchemaUID - Represents a unique identifier for a schema, extending {@link UID.Schema}.
 */
export type ComponentExtension<TSchemaUID extends UID.Schema> = {
  /**
   * Update the component data for a given entity.
   *
   * @remark This method is exposed for use within document service middlewares.
   *
   * @internal
   */
  updateComponents<const TData extends Input<TSchemaUID>>(
    entityToUpdate: { id: AttributeUtils.ID },
    data: TData
  ): Promise<ComponentBody<TSchemaUID, Extract<keyof TData, string>>>;

  /**
   * Omits component-like fields from the given input data.
   *
   * @remark This method is exposed for use within document service middlewares.
   *
   * @internal
   */
  omitComponentData<const TData extends PartialInput<TSchemaUID>>(data: TData): TData;
};
