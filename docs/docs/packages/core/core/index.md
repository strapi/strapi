---
title: '@strapi/core'
sidebar_label: 'core'
description: 'Server runtime of Strapi: the Strapi class, container, providers, registries, loaders, Document Service, HTTP server and core-api factories.'
package: '@strapi/core'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/core` is the server runtime. It defines the `Strapi` class and starts, runs and stops a Strapi application. It loads the configuration, the plugins, the APIs, the components and the middlewares. It hosts the core services, for example the Document Service, the HTTP server, the event hub, webhooks and the MCP server. It runs on the server only.

Applications do not import it directly. They import `@strapi/strapi`, which re-exports `@strapi/core`. Plugins get the `strapi` instance as a parameter. CLI commands call `createStrapi()` and `compileStrapi()`.

## Key concepts

### The `Strapi` class and the container

`Strapi` extends `Container`, a small service locator with `add`, `get` and `has`. The constructor loads the configuration and adds the core services to the container. `createStrapi()` in [`src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/index.ts) builds the instance. Read [Container and registries](../../../architecture/03-container-and-registries.md). Code: [`src/Strapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/Strapi.ts) and [`src/container.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/container.ts).

### Providers

A provider is an object with optional `init`, `register`, `bootstrap` and `destroy` functions, created with `defineProvider`. The `providers` array in `src/providers/index.ts` sets the call order. Providers add the registries, the admin, the core store, the session manager, webhooks, telemetry, cron and the MCP server to the container. They are not the same as the packages in `packages/providers/`. Read [Server lifecycle](../../../architecture/02-server-lifecycle.md).

### Registries

Registries store the artifacts that plugins, APIs and the application define: content types, components, services, controllers, policies, middlewares, hooks and others. Each artifact has a UID with a namespace such as `api::` or `plugin::`. The `registries` provider adds them to the container. Code: [`src/registries`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/registries).

### Loaders and modules

Loaders read plugins, APIs, components, middlewares, policies, sanitizers and validators from disk and from `node_modules` into the registries. A plugin or an API becomes a module (`createModule`), which runs its own `register`, `bootstrap` and `destroy`. Code: [`src/loaders`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/loaders) and [`src/domain/module`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/domain/module). See [Extension points](../../../architecture/04-extension-points.md).

### Core services

Core services live in [`src/services`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/services). They are not in the `services` registry. Examples are the Document Service (`strapi.documents`), the HTTP `server`, `eventHub`, `webhookRunner`, `entityValidator` and `content-api`. The `db` entry creates the `Database` from `@strapi/database`. The `config` service holds the configuration that the loader reads from the `config/` folder of the application. Read [Document write path](../../../architecture/05-document-write-path.md), [Event hub](./event-hub.md), [MCP server](./mcp-server.md), [Server-side telemetry](./telemetry.md), [Configuration](./configuration/00-intro.md) and [Recommended security defaults](./configuration/01-security-defaults.md).

### HTTP server

The `server` service wraps a Koa app. It builds the route managers for the admin API and the Content API, and it registers the middlewares and the routes at `bootstrap`. Code: [`src/services/server`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/services/server). Read [HTTP request path](../../../architecture/06-http-request-path.md).

### Core API factories

`createCoreController`, `createCoreService`, `createCoreRouter` and `createCoreValidator` in `src/factories.ts` build the default controller, service, router and validator of a content type. A user extends the default with a config object or callback. The exports are available as `factories` from `@strapi/strapi`. Code: [`src/core-api`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/core-api).

### Enterprise Edition gate

`strapi.EE` reads `utils.ee.isEE`. The license check runs in `bootstrap()`, after the schema sync. Code: [`src/ee`](https://github.com/strapi/strapi/tree/develop/packages/core/core/src/ee). Read [Enterprise Edition](../../../architecture/09-enterprise-edition.md).

## Related

- [Architecture overview](../../../architecture/index.md): where the runtime fits in the monorepo.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): boot order of providers, loaders and modules.
- [Container and registries](../../../architecture/03-container-and-registries.md): container keys and registry rules.
- [Glossary](../../../architecture/11-glossary.md): naming traps for provider, service, module and hook.
- [Future flags](../../../architecture/10-future-flags.md): opt-in features that the runtime reads.
- [`@strapi/strapi`](../strapi/index.md): entry package that re-exports this one.
- [`@strapi/database`](../database/index.md): `strapi.db`.
- [`@strapi/types`](../types/index.md): the `Core.Strapi` type and the `Modules.*` contracts.
- [`@strapi/admin`](../admin/index.md): loaded by the `admin` provider.
