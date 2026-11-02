---
title: Glossary
description: Terms used in the Strapi server codebase, with the naming traps that confuse new contributors.
status: draft
review_notes:
  - Drafted from internal research notes on Strapi v5 internals and spot-checked against the code on releases/5.56.0; needs a maintainer review.
  - The route validator entry describes the Zod schema builders in core-api. How the server runs these schemas on each request is not verified in this draft.
---

This glossary defines terms as the server code uses them. Each entry points to the code or to the architecture page that explains it.

:::caution
Five words have more than one meaning in the codebase:

- **Services.** The `services` registry holds plugin, API and application services. The folder `packages/core/core/src/services/` holds core implementation code. See [core service](#core-service) and [service](#service).
- **Modules.** A runtime module wraps a plugin or an API. `Modules.*` in `@strapi/types` is a namespace of TypeScript contracts for core subsystems. See [module](#module) and [`Modules.*` types](#modules-types).
- **Hooks.** The hooks registry holds server hook objects. The admin panel has its own hooks. React hooks are a third meaning. Database lifecycles are sometimes called hooks too. See [hook](#hook) and [database lifecycle](#database-lifecycle).
- **Providers.** Internal providers are lifecycle units in `packages/core/core/src/providers/`. Provider packages in `packages/providers/` implement email and upload. See [provider](#provider).
- **Lifecycles.** Module lifecycle functions are `register`, `bootstrap` and `destroy`. Database lifecycles run around queries. See [lifecycle function](#lifecycle-function).
  :::

## Runtime

### Container

The class that `Strapi` extends. It stores resolvers by name with `add`, resolves them once with `get` and caches the result. It throws on a duplicate name and has no `set` or `remove`. Code: `packages/core/core/src/container.ts`. See [Container and registries](./03-container-and-registries.md).

### Provider

An internal lifecycle unit of the server runtime, with optional `init`, `register`, `bootstrap` and `destroy` functions. The `providers` array in `packages/core/core/src/providers/index.ts` sets the call order. Not the same as a provider package in `packages/providers/`, which implements an email or upload backend. See [Server lifecycle](./02-server-lifecycle.md#internal-providers).

### Registry

An object that stores named artifacts of one kind, such as services, content types or policies. The `registries` provider adds 14 registries to the container. Most registries have `add`, `get` and `getAll`. Some also have `set` and `extend`. Code: `packages/core/core/src/registries/`.

### Core service

A subsystem implemented in `packages/core/core/src/services/`, for example the Document Service, the event hub, the webhook runner or the HTTP server. `Strapi` or a provider mounts it in the container. It is not in the `services` registry.

### Service

An entry in the `services` registry, defined by a plugin, an API or the application. The registry stores a factory and calls it with `{ strapi }` on the first `get`. Read it with `strapi.service(uid)`.

### Module

The runtime wrapper around a plugin or an API. `createModule(namespace, rawModule, strapi)` builds it. When the `modules` registry adds it, it calls `module.load()`, which puts the module artifacts into the registries. The module also runs the `register`, `bootstrap` and `destroy` functions of the raw module, once each. Code: `packages/core/core/src/domain/module/index.ts`.

### Raw module

The object that a plugin `strapi-server` entry or an API folder produces: `register`, `bootstrap`, `destroy`, `config`, `routes`, `controllers`, `services`, `contentTypes`, `policies` and `middlewares`. The loaders build it, and the `modules` registry wraps it.

### `Modules.*` types

A TypeScript namespace in `@strapi/types` (`packages/core/types/src/modules/`). It holds the contracts of core subsystems, for example `Modules.Documents.Service` for `strapi.documents` or `Modules.EventHub.EventHub` for `strapi.eventHub`. It is not related to runtime modules.

### Namespace

The prefix of a UID. Scoped namespaces are `api::<name>` and `plugin::<name>`. The other namespaces are `admin::`, `strapi::` and `global::`. Code: `packages/core/core/src/registries/namespace.ts`.

### UID

The full key of an artifact in a registry. A scoped namespace is followed by a dot and the name, for example `api::article.article` or `plugin::upload.file`. The other namespaces are followed directly by the name, for example `admin::user`, `strapi::cors` or `global::is-owner`. A component UID has no namespace: `<category>.<name>`. See [Namespaces and UIDs](./03-container-and-registries.md#namespaces-and-uids).

### Loader

A function in `packages/core/core/src/loaders/` that reads the file system or the enabled plugins and fills the registries. `loadApplicationContext()` runs the eight loaders with `Promise.all` during the `registries` provider `register` step.

### Lifecycle function

One of `register`, `bootstrap` or `destroy`. Providers, modules, the admin and the application can each define them. `Strapi` calls them in a fixed order. See [Server lifecycle](./02-server-lifecycle.md).

## Extension

### Hook

A named list of handlers in the `hooks` registry. `strapi.hook(uid)` returns it. The hook objects come from the `hooks` module of `@strapi/utils` (series, waterfall, parallel or bail). Core defines `strapi::content-types.beforeSync` and `strapi::content-types.afterSync`. See [Hooks registry](./04-extension-points.md#hooks-registry).

### Database lifecycle

A subscriber that `@strapi/database` calls before and after each entity manager query, for example `beforeCreate` or `afterDelete`. Add one with `strapi.db.lifecycles.subscribe()` or with a `lifecycles` file next to a content-type schema. See [Database lifecycles](./04-extension-points.md#database-lifecycles).

### Document middleware

A function `(ctx, next)` that wraps every Document Service method call. Add one with `strapi.documents.use()`. `ctx` holds `uid`, `contentType`, `action` and `params`. See [Document Service middlewares](./04-extension-points.md#document-service-middlewares).

### Event hub

The in-process publish and subscribe service at `strapi.eventHub`. `on` adds a listener for one event name. `subscribe` adds a function that receives every event. `emit` awaits each subscriber and listener in order. Code: `packages/core/core/src/services/event-hub.ts`.

### Webhook allowed events

The list of event names that a webhook can subscribe to. The webhook store holds it as a map. Core adds the six `entry.*` events. Plugins add their own with `strapi.get('webhookStore').addAllowedEvent(key, value)`. Code: `packages/core/core/src/services/webhook-store.ts`.

### Custom field

A field type that a plugin or the application registers with `strapi.customFields.register()`. It maps to a built-in type. At the end of the register phase, Strapi replaces each custom field attribute type with that built-in type.

:::caution
`strapi.customFields` is a small service in the container (key `customFields`). The registry that stores the definitions is `strapi.get('custom-fields')`.
:::

## Content model

### Content type

A schema that defines a kind of entry, with `kind` set to `collectionType` or `singleType`. It lives in the `content-types` registry under a UID such as `api::article.article`. Strapi adds system attributes to each schema: timestamps, `publishedAt`, creator fields and, when enabled, `firstPublishedAt`. The i18n plugin adds `locale` and `localizations`.

### Component

A reusable group of attributes. Its UID is `<category>.<name>`. The `components` registry stores it. A content type uses a component through an attribute of type `component`.

### Dynamic zone

An attribute of type `dynamiczone`. It holds an ordered list of components, chosen from the list in the attribute `components` option.

### Core store

A key-value table (`strapi_core_store_settings`, model `strapi::core-store`) that core and plugins use for settings. Core stores the previous content-type schemas there to compare them at the next boot. Access it with `strapi.store`.

## Document Service

### Document

One logical entry of a content type. It can have many rows: one per locale and per state (draft or published).

### documentId

The string that identifies a document. All rows of the document share it. The database layer generates it with `createId` from `@paralleldrive/cuid2`. A row also has a numeric `id`, which changes when publish replaces the published row.

### Draft and publish (D&P)

A content-type option (`options.draftAndPublish`). With D&P, a row with `publishedAt: null` is the draft, and a row with a date is the published version. Without D&P, every row has a date, and the `publish`, `unpublish` and `discardDraft` methods are `undefined`.

### Lookup

An internal object that the Document Service parameter pipeline builds from `status` and `locale`. `transformParamsToQuery` merges it into the `where` clause. The repository rejects a `lookup` param from the caller.

### Entries service

The layer under the Document Service repository, in `document-service/entries.ts`. It resolves relation `documentId` values to row `id` values, checks uniqueness, runs the entity validator, writes components and calls `strapi.db.query(uid)`.

### Entity validator

The service at `strapi.entityValidator` that validates create and update data against a content-type schema with Yup. It relaxes some rules for drafts. Code: `packages/core/core/src/services/entity-validator/`.

### Route validator

The classes in `packages/core/core/src/core-api/routes/validation/`, for example `CoreContentTypeRouteValidator`. They build Zod schemas for the query params, the body and the response of core API routes from the content-type schema. They are separate from the entity validator.

### Entity Service

The data API that the Document Service replaces. `strapi.entityService` is deprecated. New code uses `strapi.documents`.

## Code map

| Concern                            | Path                                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container                          | [`packages/core/core/src/container.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/container.ts)                                                                                                                                                                                     |
| Internal providers                 | [`packages/core/core/src/providers/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/providers/index.ts)                                                                                                                                                                         |
| Registries                         | [`packages/core/core/src/registries/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/index.ts)                                                                                                                                                                       |
| Runtime module                     | [`packages/core/core/src/domain/module/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/domain/module/index.ts)                                                                                                                                                                 |
| `Modules.*` types                  | [`packages/core/types/src/modules/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/modules/index.ts)                                                                                                                                                                           |
| Namespace rule                     | [`packages/core/core/src/registries/namespace.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/namespace.ts)                                                                                                                                                               |
| Loaders                            | [`packages/core/core/src/loaders/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/index.ts)                                                                                                                                                                             |
| Hook factories                     | [`packages/core/utils/src/hooks.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/utils/src/hooks.ts)                                                                                                                                                                                           |
| Database lifecycles                | [`packages/core/database/src/lifecycles/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/lifecycles/index.ts)                                                                                                                                                               |
| Event hub                          | [`packages/core/core/src/services/event-hub.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/event-hub.ts)                                                                                                                                                                   |
| Custom fields service and registry | [`packages/core/core/src/services/custom-fields.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/custom-fields.ts), [`packages/core/core/src/registries/custom-fields.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/custom-fields.ts) |
| Content-type system attributes     | [`packages/core/core/src/domain/content-type/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/domain/content-type/index.ts)                                                                                                                                                     |
| Core store                         | [`packages/core/core/src/services/core-store.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/core-store.ts)                                                                                                                                                                 |
| Document Service                   | [`packages/core/core/src/services/document-service/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/document-service/index.ts)                                                                                                                                         |
| Entity validator                   | [`packages/core/core/src/services/entity-validator/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/entity-validator/index.ts)                                                                                                                                         |
| Route validator                    | [`packages/core/core/src/core-api/routes/validation/content-type.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/core-api/routes/validation/content-type.ts)                                                                                                                         |

## Related

- [Architecture overview](./index.md)
- [Container and registries](./03-container-and-registries.md)
- [Extension points](./04-extension-points.md)
- [Document write path](./05-document-write-path.md)
