---
title: Architecture overview
description: How the main parts of Strapi fit together at runtime, and which architecture pages to read first.
sidebar_position: 0
status: draft
review_notes:
  - Drafted from internal research notes on Strapi v5 internals and spot-checked against the code on releases/5.56.0; needs a maintainer review.
  - The reading tracks are a first proposal. A maintainer must confirm the order.
  - The Authentication, Enterprise Edition and Future flags pages are moved from older docs. This draft set does not verify them.
---

This section explains how the parts of Strapi work together. It covers topics that cross package boundaries. For one package at a time, read the package pages. For the list of packages and their dependencies, read the [package map](./01-package-map.mdx).

## What the monorepo contains

Strapi is a Yarn workspaces and Nx monorepo. The workspace packages are in `packages/`. The table shows the main parts.

| Part              | Main packages                                                                                                                                   | What it does                                                                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server runtime    | `@strapi/core` (`packages/core/core`)                                                                                                           | Defines the `Strapi` class, the container, the internal providers, the registries and the loaders. Contains the core services: Document Service, event hub, webhooks, Koa HTTP server and others.                     |
| Entry package     | `@strapi/strapi` (`packages/core/strapi`)                                                                                                       | Re-exports `@strapi/core` and the types. Contains the `strapi` CLI and the admin build tooling. Applications depend on this package.                                                                                  |
| Admin panel       | `@strapi/admin` (`packages/core/admin`)                                                                                                         | Contains the React admin application (`admin/`) and its server part (`server/`). The server part holds admin users, roles, admin authentication and admin routes.                                                     |
| Database layer    | `@strapi/database` (`packages/core/database`)                                                                                                   | A layer on top of Knex: model metadata, schema sync, migrations, entity manager, query builder, database lifecycles and transactions. Dialects: SQLite, PostgreSQL and MySQL. The MySQL dialect also handles MariaDB. |
| Shared code       | `@strapi/types`, `@strapi/utils`, `@strapi/permissions`                                                                                         | Shared TypeScript types, shared helpers (hooks, sanitize, validate, errors) and the permission engine.                                                                                                                |
| Core plugins      | `packages/core/content-manager`, `content-type-builder`, `upload`, `email`, `content-releases`, `review-workflows`, and `packages/plugins/i18n` | Plugins that the plugin loader always enables.                                                                                                                                                                        |
| Other plugins     | `packages/plugins/*`                                                                                                                            | Plugins that an application installs, for example `users-permissions`, `graphql` and `documentation`.                                                                                                                 |
| Provider packages | `packages/providers/*`                                                                                                                          | Implementations for the email and upload plugins, for example `upload-aws-s3` or `email-sendgrid`.                                                                                                                    |

:::caution
The word "provider" has two meanings. `packages/providers/*` are email and upload implementations. `packages/core/core/src/providers/` are internal lifecycle units of the server runtime. Read the [glossary](./11-glossary.md) for other naming traps.
:::

## Server and admin split

Strapi has two runtimes. The server is a Node.js process. The admin panel is a React application. It runs in the browser and calls the server over HTTP.

A package that adds code to both runtimes declares two entry points in the `exports` field of its `package.json`:

- `./strapi-server` contains the Node.js code. The plugin loader in `@strapi/core` resolves this export. If the export is missing, it uses `./strapi-server.js`.
- `./strapi-admin` contains the React code. The admin build in `@strapi/strapi` collects this export from each enabled plugin and bundles it into the admin application.

`@strapi/admin` uses the same two entry points. The server does not load `@strapi/admin/strapi-server` through the plugin loader. The internal `admin` provider loads it. The admin artifacts use the `admin::` namespace.

## The Strapi class

`Strapi` extends a small `Container` class. The instance is the central hub of the server. Code receives it as a `strapi` parameter, for example in `register({ strapi })` or in a service factory `({ strapi }) => ({ ... })`.

The instance gives access to:

- core services, for example `strapi.documents`, `strapi.db`, `strapi.eventHub`, `strapi.server` and `strapi.log`;
- registries, through `strapi.get('<name>')` and shortcuts such as `strapi.service(uid)` or `strapi.contentType(uid)`.

`createStrapi()` also assigns the instance to `global.strapi`. A code comment marks this for removal in a future major version. Some internal modules still read the global, for example the Document Service repository and the plugin loader. New code must receive `strapi` as a parameter.

Read [Container and registries](./03-container-and-registries.md) for details.

## Lifecycle in one paragraph

`createStrapi()` creates the instance. The constructor loads the configuration, adds the core services to the container and runs the `init` step of each internal provider. `strapi.start()` calls `load()` and then `listen()`. `load()` runs `register()` and then `bootstrap()`. During `register()`, the loaders read plugins, APIs, components, middlewares and policies into the registries, and each plugin and API runs its `register` function. During `bootstrap()`, the database initializes and syncs the schema, the HTTP server builds its middlewares and routes, and each plugin and API runs its `bootstrap` function. `destroy()` runs the `destroy` functions and closes the HTTP server and the database connection. Read [Server lifecycle](./02-server-lifecycle.md) for the exact order.

## Pages in this section

| Page                                                         | Topic                                                            |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| [Package map](./01-package-map.mdx)                          | Packages and their dependencies.                                 |
| [Server lifecycle](./02-server-lifecycle.md)                 | Boot order, providers, loaders and shutdown.                     |
| [Container and registries](./03-container-and-registries.md) | Container rules, registries, namespaces and UIDs.                |
| [Extension points](./04-extension-points.md)                 | How plugins and applications extend Strapi.                      |
| [Document write path](./05-document-write-path.md)           | What happens when code creates, updates or publishes a document. |
| [HTTP request path](./06-http-request-path.md)               | What happens to a request from Koa to the response.              |
| [Schema sync](./07-schema-sync.md)                           | How schemas become database tables at startup.                   |
| [Authentication](./08-authentication.md)                     | Sessions and JWT.                                                |
| [Enterprise Edition](./09-enterprise-edition.md)             | How Enterprise features are gated.                               |
| [Future flags](./10-future-flags.md)                         | Opt-in features.                                                 |
| [Glossary](./11-glossary.md)                                 | Terms and naming traps.                                          |

## Reading tracks

### New backend contributor

1. This page.
2. [Server lifecycle](./02-server-lifecycle.md)
3. [Container and registries](./03-container-and-registries.md)
4. [HTTP request path](./06-http-request-path.md)
5. [Document write path](./05-document-write-path.md)
6. [Schema sync](./07-schema-sync.md)
7. [Glossary](./11-glossary.md)
8. The [`@strapi/core`](../packages/core/core/index.md) and [`@strapi/database`](../packages/core/database/index.md) package pages.

### New admin contributor

1. This page, mainly [Server and admin split](#server-and-admin-split).
2. [Package map](./01-package-map.mdx)
3. The [`@strapi/admin`](../packages/core/admin/index.md) package page.
4. [Authentication](./08-authentication.md)
5. [Enterprise Edition](./09-enterprise-edition.md)
6. [Glossary](./11-glossary.md)

### Plugin author-contributor

1. This page.
2. [Server lifecycle](./02-server-lifecycle.md), mainly the register and bootstrap phases.
3. [Extension points](./04-extension-points.md)
4. [Container and registries](./03-container-and-registries.md)
5. [HTTP request path](./06-http-request-path.md), for routes, policies and route middlewares.
6. [Document write path](./05-document-write-path.md), for document middlewares and events.
7. [Glossary](./11-glossary.md)

## Code map

| Concern                                     | Path                                                                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Strapi` class                              | [`packages/core/core/src/Strapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/Strapi.ts)                                                           |
| `createStrapi()` and `global.strapi`        | [`packages/core/core/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/index.ts)                                                             |
| `@strapi/strapi` re-export                  | [`packages/core/strapi/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/strapi/src/index.ts)                                                         |
| Admin build: collect `strapi-admin` entries | [`packages/core/strapi/src/node/core/plugins.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/strapi/src/node/core/plugins.ts)                                 |
| Plugin loader: resolve `strapi-server`      | [`packages/core/core/src/loaders/plugins/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/plugins/index.ts)                             |
| Always-enabled plugins list                 | [`packages/core/core/src/loaders/plugins/get-enabled-plugins.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/plugins/get-enabled-plugins.ts) |
| Admin provider                              | [`packages/core/core/src/providers/admin.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/providers/admin.ts)                                         |
| Admin React entry                           | [`packages/core/admin/admin/src/StrapiApp.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/StrapiApp.tsx)                                     |
| Admin server entry                          | [`packages/core/admin/server/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/server/src/index.ts)                                             |
| Database class                              | [`packages/core/database/src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/index.ts)                                                     |

## Related

- [`@strapi/core` package](../packages/core/core/index.md)
- [`@strapi/strapi` package](../packages/core/strapi/index.md)
- [`@strapi/admin` package](../packages/core/admin/index.md)
- [`@strapi/database` package](../packages/core/database/index.md)
