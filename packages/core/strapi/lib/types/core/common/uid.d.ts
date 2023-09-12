import type {
  Shared,
  Schema as SchemaNamespace,
  Common,
  Registry,
  UID,
  Utils,
} from '@strapi/strapi';

export type Service = Registry.Keys<Shared.Services, UID.Service>;

export type Controller = Registry.Keys<Shared.Controllers, UID.Controller>;

export type Policy = Registry.Keys<Shared.Policies, UID.Policy>;

export type Middleware = Registry.Keys<Shared.Middlewares, UID.Middleware>;

export type ContentType = Registry.Keys<Shared.ContentTypes, UID.ContentType>;

export type CollectionType = Utils.Guard.Never<
  // extract uids only for collection types
  Extract<Utils.Object.KeysBy<Shared.ContentTypes, SchemaNamespace.CollectionType>, ContentType>,
  // if no collection type is found (never), fallback to a generic content type uid
  ContentType
>;

export type SingleType = Utils.Guard.Never<
  // extract uids only for single types
  Extract<Utils.Object.KeysBy<Shared.ContentTypes, SchemaNamespace.SingleType>, ContentType>,
  // if no single type is found (never), fallback to a generic content type uid
  ContentType
>;

export type Component = Registry.Keys<Shared.Components, UID.Component>;
export type ComponentCategory = Component extends UID.Component<infer TCategory>
  ? TCategory
  : never;

export type Schema = Registry.Keys<
  Common.Schemas,
  UID.ContentType | UID.Component<ComponentCategory>
>;

export type IsCollectionType<TSchemaUID extends Schema> = TSchemaUID extends CollectionType
  ? Utils.Expression.Extends<Shared.ContentTypes[TSchemaUID], SchemaNamespace.CollectionType>
  : Utils.Expression.False;

export type IsSingleType<TSchemaUID extends Schema> = TSchemaUID extends SingleType
  ? Utils.Expression.Extends<Shared.ContentTypes[TSchemaUID], SchemaNamespace.SingleType>
  : Utils.Expression.False;

export type IsComponent<TSchemaUID extends Schema> = TSchemaUID extends Component
  ? Utils.Expression.Extends<Shared.Components[TSchemaUID], SchemaNamespace.Component>
  : Utils.Expression.False;

export type IsContentType<TSchemaUID extends Schema> = TSchemaUID extends ContentType
  ? Utils.Expression.Or<IsCollectionType<TSchemaUID>, IsSingleType<TSchemaUID>>
  : Utils.Expression.False;
