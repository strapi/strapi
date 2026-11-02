---
title: '@strapi/types'
sidebar_label: 'types'
description: 'Shared TypeScript types for Strapi internals: server runtime, schemas, UIDs, documents and public registries.'
package: '@strapi/types'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
  - The namespace summaries in Key concepts come from a read of the folder names and entry files, not from every type. Check `Struct` versus `Schema` and the `Modules` list.
---

## Purpose

`@strapi/types` is the single source of truth for the TypeScript types that the Strapi packages share. It has no runtime logic. The server packages use it to type the `Strapi` instance, the container, plugins, services, controllers, schemas and the Document Service.

The package README marks it as internal. Application developers import the same types from `@strapi/strapi`, which re-exports `@strapi/types` with `export type *`. The type system is built to adapt to the schemas of one application, and the [Type System](./type-system/index.mdx) pages explain how.

## Key concepts

### Namespaces

`src/index.ts` exports each area as a type namespace.

- `Core`: the server runtime types. It holds `Strapi`, the container, controllers, services, policies, middlewares, routes, plugins and configuration.
- `Modules`: the types of the core services, for example the Document Service, event hub, cron, core store, server and session manager.
- `Data`: the shape of entities, content types and components as data.
- `Struct`: the base schema types and the schema definitions.
- `Schema`: the high-level schema types and `Schema.Attribute`. They read the public registries.
- `UID`: the UID types. They read the public registries.
- `Internal`: the low-level `Namespace`, `UID` and `Registry` types. They do not depend on an application.
- `Public`: the public registries that applications augment.
- `Plugin`: the `LoadedPlugin` shape, the `IsEnabled` helper and the `Config` types for the `strapi-server` and `strapi-admin` entry points.
- `Utils`: type helpers, such as `Get`, `If` and the `Object`, `String` and `Guard` groups.

### Schema

A schema describes the structure of a content type or a component. The base `Schema` type has a `modelType` discriminant (`contentType` or `component`). A content type schema has a `kind` (`collectionType` or `singleType`). A schema type describes a loaded schema, not a raw definition or a database model. See [Schema](./type-system/02-concepts/01-schema.mdx).

### UID

A UID is a string literal type that identifies a resource, for example `api::article.article`, `plugin::upload.file`, `admin::user` or `default.seo`. Different kinds of resources can share a UID string, and TypeScript cannot tell them apart. See [UID](./type-system/02-concepts/02-uid.md).

### Public registries

A public registry is an interface with an index signature, for example `ContentTypeSchemas`, `ComponentSchemas`, `Services`, `Controllers`, `Policies` and `Middlewares` in `src/public/registries.ts`. An application adds its own entries with module augmentation, and Strapi types then resolve to the application schemas. The `strapi ts:generate-types` command writes these augmentations. When a registry is empty, the types fall back to their generic form. See [Public registries](./type-system/02-concepts/03-public-registry.mdx).

### Global declaration

`src/index.ts` also declares a global `strapi` variable of type `Strapi`. This matches the `global.strapi` assignment in `createStrapi()`. New code must receive `strapi` as a parameter.

### Working with the types

Read the [philosophy](./type-system/01-philosophy.md) before you change a type, because a change can slow down TypeScript for every application. The [cheatsheet](./type-system/03-cheatsheet.mdx) lists common patterns.

## Related

- [Container and registries](../../../architecture/03-container-and-registries.md): the runtime side of UIDs and namespaces.
- [Glossary](../../../architecture/11-glossary.md): the UID and namespace terms.
- [`@strapi/strapi`](../strapi/index.md): re-exports these types to applications.
- [`@strapi/core`](../core/index.md): implements the `Core.Strapi` interface.
- [`@strapi/utils`](../utils/index.md): the runtime helpers that go with the shared types.
- [`@strapi/typescript-utils`](../../utils/typescript/index.md): generates the application types that augment the public registries.
