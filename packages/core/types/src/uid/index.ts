import type * as Internal from '../internal';
import type * as Struct from '../struct';
import type { Constants, Guard, Object, Extends, Or } from '../utils';
import type * as Public from '../public';

/**
 * Combines ContentType and Component UID types in a single union type.
 *
 * `UID.Schema` provides the ability to deal with both content types and components through one streamlined type.
 *
 * It hinges on underlying schema registries, which aggregates and maps unique identifiers to their respective schemas.
 *
 * This type would typically be used where the context is not particular about dealing with content types or components exclusively but rather any kind of schema.
 *
 * @example
 * Let's assume we need a function that processes schema irrespective of whether it's ContenType or Component.
 *
 * ```typescript
 * import type { UID } from '@strapi/types';
 *
 * function processSchema(schemaID: UID.Schema) {
 *     // Implementation goes here...
 * }
 *
 * // Now, calling processSchema() with uid of content type
 * processSchema('api::foo.foo');
 *
 * // And calling processSchema() with uid of component
 * processSchema('default.foo');
 * ```
 *
 * @see {@link ContentType} Identifier for content types based on the public registry.
 * @see {@link Component} Identifier for components based on the public registry.
 */
export type Schema = ContentType | Component;

/**
 * Unique identifiers for any content-type defined in the public content-type registry.
 *
 * Useful when it's required to work with data structures that can only be identified by the underlying content-type UID.
 *
 * When no content-types are declared in the registry, it uses the generic {@link Internal.UID.ContentType} instead.
 *
 * @example
 * Here's an example of how to use the `UID.ContentType` type:
 *
 * ```typescript
 * import type { UID } from '@strapi/types';
 *
 * // Assume we have a function that requires a ContentType UID
 * function fetchSchema(uid: UID.ContentType) {
 *   // Implementation goes here...
 * }
 *
 * // Now you can pass the unique identifier for a content type to fetch its schema
 * fetchSchema('api::foo.foo');
 * ```
 * @see {@link Public.ContentTypeSchemas} Content-type public registry.
 * @see {@link UID.ContentType} ContentType UID format definition.
 */
export type ContentType = Internal.Registry.Keys<
  Public.ContentTypeSchemas,
  Internal.UID.ContentType
>;

/**
 * Unique identifiers for any component defined in the public component registry.
 *
 * Useful when it's required to work with data structures that can only be identified by the underlying component UID.
 *
 * When no component are declared in the registry, it uses the generic {@link Internal.UID.Component} instead.
 *
 * @example
 * Here's an example of how to use the `UID.Component` type:
 *
 * ```typescript
 * import type { UID } from '@strapi/types';
 *
 * // Assume we have a function that requires a Component UID
 * function fetchSchema(uid: UID.Component) {
 *   // Implementation goes here...
 * }
 *
 * // Now you can pass the unique identifier for a component to fetch its schema
 * fetchSchema('default.foo');
 * ```
 * @see {@link Public.ComponentSchemas} Component public registry.
 * @see {@link UID.Component} Component UID format definition.
 */
export type Component = Internal.Registry.Keys<Public.ComponentSchemas, Internal.UID.Component>;

/**
 * Obtains a union of every component's category from the public component registry.
 *
 * It utilizes [conditional types inference](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html#inferring-within-conditional-types) to extract the category name from the components' UID.
 *
 * The component UID format is a string that follows a specific pattern defined by {@link Internal.UID.Component}.
 * If a type extends `Internal.UID.Component`, it implies that it has a structure with `TCategory` string as the category name of the component.
 *
 * @see {@link Internal.UID.Component} for more details on how the component's unique identifier is structured.
 */
export type ComponentCategory =
  Component extends Internal.UID.Component<infer TCategory> ? TCategory : never;

/**
 * Collection-Type UID based on the public content-type registry
 *
 * If no collection type is found, it fallbacks to a generic content-type UID.
 */
export type CollectionType = Guard.Never<
  Extract<Object.KeysBy<Public.ContentTypeSchemas, Struct.CollectionTypeSchema>, ContentType>,
  Internal.UID.ContentType
>;

/**
 * Single-Type UID based on the public content-type registry
 *
 * If no single type is found, it falls back to a generic content-type UID.
 */
export type SingleType = Guard.Never<
  Extract<Object.KeysBy<Public.ContentTypeSchemas, Struct.SingleTypeSchema>, ContentType>,
  Internal.UID.ContentType
>;

/**
 * Service UID based on the public service registry
 *
 * @see {Public.Services}
 */
export type Service = Internal.Registry.Keys<Public.Services, Internal.UID.Service>;

/**
 * Controller UID based on the public service registry
 *
 * @see {Public.Controllers}
 */
export type Controller = Internal.Registry.Keys<Public.Controllers, Internal.UID.Controller>;

/**
 * Policy UID based on the public service registry
 *
 * @see {Public.Policies}
 */
export type Policy = Internal.Registry.Keys<Public.Policies, Internal.UID.Policy>;

/**
 * Middleware UID based on the public service registry
 *
 * @see {Public.Middlewares}
 */
export type Middleware = Internal.Registry.Keys<Public.Middlewares, Internal.UID.Middleware>;

/**
 * Verifies if a certain schema UIDs correspond to a collection type.
 *
 * Given a schema UID, it checks if it matches the {@link CollectionType} UID type. Since {@link CollectionType}
 * can resolve to the more generic {@link ContentType} type, we also need to check that the associated
 * schema extends the {@link Struct.CollectionTypeSchema} data structure.
 *
 * @template TSchemaUID - The UID of the schema
 */
export type IsCollectionType<TSchemaUID extends Schema> = TSchemaUID extends CollectionType
  ? Extends<Public.ContentTypeSchemas[TSchemaUID], Struct.CollectionTypeSchema>
  : Constants.False;

/**
 * Verifies if a certain schema UIDs correspond to a single type.
 *
 * Given a schema UID, it checks if it matches the {@link SingleType} UID type. Since {@link SingleType}
 * can resolve to the more generic {@link ContentType} type, we also need to check that the associated
 * schema extends the {@link Struct.CollectionTypeSchema} data structure.
 *
 * @template TSchemaUID - The UID of the schema
 */
export type IsSingleType<TSchemaUID extends Schema> = TSchemaUID extends SingleType
  ? Extends<Public.ContentTypeSchemas[TSchemaUID], Struct.SingleTypeSchema>
  : Constants.False;

/**
 * Verifies if a certain schema UIDs correspond to a component.
 *
 * Given a schema UID, it checks if it matches the {@link Component} UID type.
 *
 * @template TSchemaUID - The UID of the schema
 */
export type IsComponent<TSchemaUID extends Schema> = TSchemaUID extends Component
  ? Extends<Public.ComponentSchemas[TSchemaUID], Struct.ComponentSchema>
  : Constants.False;

/**
 * Verifies if a certain schema UIDs correspond to a content-type.
 *
 * Given a schema UID, it checks if it matches the {@link ContentType} UID type.
 *
 * @template TSchemaUID - The UID of the schema
 */
export type IsContentType<TSchemaUID extends Schema> = TSchemaUID extends ContentType
  ? Or<IsCollectionType<TSchemaUID>, IsSingleType<TSchemaUID>>
  : Constants.False;
