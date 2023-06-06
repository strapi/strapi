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
export type CollectionType = Extract<
  Utils.Object.KeysBy<Shared.ContentTypes, SchemaNamespace.CollectionType>,
  ContentType
>;
export type SingleType = Extract<
  Utils.Object.KeysBy<Shared.ContentTypes, SchemaNamespace.SingleType>,
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
