import type * as Internal from '../internal';
import type * as Struct from '../struct';
import type { Constants, Guard, Object, Extends, Or } from '../utils';
import type * as Public from '../public';

/**
 * Schemas' UIDs based on the public schema registries.
 *
 * It includes both ContentTypeSchemas and ComponentSchemas
 */
export type Schema = ContentType | Component;

/**
 * Content-Types' UIDs based on the public content-type registry.
 */
export type ContentType = Internal.Registry.Keys<
  Public.ContentTypeSchemas,
  Internal.UID.ContentType
>;

/**
 * Components' UIDs based on the public component registry.
 */
export type Component = Internal.Registry.Keys<Public.ComponentSchemas, Internal.UID.Component>;

/**
 * Union of every components' category, based on the public component registry
 */
export type ComponentCategory = Component extends Internal.UID.Component<infer TCategory>
  ? TCategory
  : never;

/**
 * Collection-Types' UIDs based on the public content-type registry.
 *
 * If no collection type is found, fallback to a generic content-type UID.
 */
export type CollectionType = Guard.Never<
  Extract<Object.KeysBy<Public.ContentTypeSchemas, Struct.CollectionTypeSchema>, ContentType>,
  Internal.UID.ContentType
>;

/**
 * Single-Type's UIDs based on the public content-type registry
 *
 * If no collection type is found, fallback to a generic content-type UID.
 */
export type SingleType = Guard.Never<
  Extract<Object.KeysBy<Public.ContentTypeSchemas, Struct.SingleTypeSchema>, ContentType>,
  Internal.UID.ContentType
>;

export type Service = Internal.Registry.Keys<Public.Services, Internal.UID.Service>;

export type Controller = Internal.Registry.Keys<Public.Controllers, Internal.UID.Controller>;

export type Policy = Internal.Registry.Keys<Public.Policies, Internal.UID.Policy>;

export type Middleware = Internal.Registry.Keys<Public.Middlewares, Internal.UID.Middleware>;

// TODO: [TS2] Maybe need some refactoring
export type IsCollectionType<TSchemaUID extends Schema> = TSchemaUID extends CollectionType
  ? Extends<Public.ContentTypeSchemas[TSchemaUID], Struct.CollectionTypeSchema>
  : Constants.False;

export type IsSingleType<TSchemaUID extends Schema> = TSchemaUID extends SingleType
  ? Extends<Public.ContentTypeSchemas[TSchemaUID], Struct.SingleTypeSchema>
  : Constants.False;

export type IsComponent<TSchemaUID extends Schema> = TSchemaUID extends Component
  ? Extends<Public.ComponentSchemas[TSchemaUID], Struct.ComponentSchema>
  : Constants.False;

export type IsContentType<TSchemaUID extends Schema> = TSchemaUID extends ContentType
  ? Or<IsCollectionType<TSchemaUID>, IsSingleType<TSchemaUID>>
  : Constants.False;
