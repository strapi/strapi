---
title: Container and registries
description: How the Strapi container stores core subsystems, how registries store plugin, API and application artifacts, and how UIDs are built.
status: draft
review_notes:
  - Drafted from internal research notes on Strapi v5 internals and spot-checked against the code on releases/5.56.0; needs a maintainer review.
  - The container key list reflects releases/5.56.0. It changes when a provider or an internal service is added.
---

The `Strapi` instance is a container. The container holds core subsystems and registries. Registries hold the artifacts that plugins, APIs and the application define. This page describes both layers and the UID rules.

## The container

`Strapi` extends `Container`. The container is a small service locator with three methods.

| Method                | Behavior                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `add(name, resolver)` | Stores the resolver under `name`. Throws `Cannot register already registered service <name>` if `name` exists. Returns the container, so calls can chain.                                                                                                                                  |
| `get(name, args?)`    | Returns the cached value if `name` was resolved before. Otherwise, if the resolver is a function, calls `resolver(container, args)` once and caches the result. If the resolver is not a function, caches it as the value. Throws `Could not resolve service <name>` if `name` is unknown. |
| `has(name)`           | Returns `true` if `name` is registered or resolved.                                                                                                                                                                                                                                        |

The container has no `set` and no `remove`. After `add`, nothing can replace an entry. Every resolved value is a singleton. A `TODO` comment in `container.ts` notes that there is no per-call instantiation.

:::caution
The container always calls a function resolver. To store a function as the value, wrap it in a factory: `strapi.add('myFn', () => myFn)`.
:::

Controlled replacement happens one level down, in the registries. See [Registry operations](#registry-operations).

### Container keys

| Origin                              | Keys                                                                                                                                                                                                                                                                                 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Strapi.registerInternalServices()` | `config`, `query-params`, `content-api`, `content-api-schema-registry`, `auth`, `server`, `fs`, `eventHub`, `startupLogger`, `logger`, `fetch`, `features`, `requestContext`, `customFields`, `entityValidator`, `entityService`, `documents`, `db`, `reload`, `content-source-maps` |
| `registries` provider               | `content-types`, `components`, `services`, `policies`, `middlewares`, `hooks`, `controllers`, `modules`, `plugins`, `custom-fields`, `apis`, `models`, `sanitizers`, `validators`                                                                                                    |
| Other internal providers            | `admin`, `ai`, `content-structure`, `coreStore`, `sessionManager`, `webhookStore`, `webhookRunner`, `telemetry`, `cron`, `ai.mcp`                                                                                                                                                    |
| `@strapi/admin` server `register`   | `ai.admin`                                                                                                                                                                                                                                                                           |

The key style is mixed: camelCase (`eventHub`), kebab-case (`content-types`) and dotted (`ai.mcp`). The container treats a dot as a normal character.

Many `strapi.*` getters read a container key, and some names differ:

| Getter                | Container key                                                  |
| --------------------- | -------------------------------------------------------------- |
| `strapi.log`          | `logger`                                                       |
| `strapi.store`        | `coreStore`                                                    |
| `strapi.contentAPI`   | `content-api`                                                  |
| `strapi.customFields` | `customFields` (a service), not `custom-fields` (the registry) |
| `strapi.ai.mcp`       | `ai.mcp`                                                       |

Some getters read a registry instead: `strapi.services`, `strapi.controllers`, `strapi.contentTypes`, `strapi.components`, `strapi.policies`, `strapi.middlewares`, `strapi.plugins`, `strapi.hooks` and `strapi.apis` call `getAll()` on the matching registry.

## Registries

The `registries` provider adds 14 registries to the container in its `init` step. `strapi.get('<name>')` returns the registry object.

| Key             | Stores                                               | Key format                                    | Methods                                                              |
| --------------- | ---------------------------------------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| `content-types` | Content-type schemas                                 | `<namespace>.<name>` or `admin::<name>`       | `keys`, `get`, `getAll(ns)`, `set`, `add(ns, map)`, `extend`         |
| `components`    | Component schemas                                    | `<category>.<name>`                           | `keys`, `get`, `getAll()`, `set`, `add(map)`                         |
| `services`      | Service factories and instances                      | namespaced UID                                | `keys`, `get`, `getAll(ns)`, `set`, `add(ns, map)`, `extend`         |
| `controllers`   | Controller factories and instances                   | namespaced UID                                | `keys`, `get`, `getAll(ns)`, `set`, `add(ns, map)`, `extend`         |
| `policies`      | Policies                                             | namespaced UID                                | `keys`, `get`, `has`, `getAll(ns)`, `set`, `add(ns, map)`, `resolve` |
| `middlewares`   | Middleware factories                                 | namespaced UID                                | `keys`, `get`, `getAll(ns)`, `set`, `add(ns, map)`, `extend`         |
| `hooks`         | Hook objects                                         | namespaced UID                                | `keys`, `get`, `getAll(ns)`, `set`, `add(ns, map)`, `extend`         |
| `modules`       | Runtime modules (plugins and APIs)                   | `plugin::<name>`, `api::<name>`               | `get`, `getAll(prefix)`, `add`, `register`, `bootstrap`, `destroy`   |
| `plugins`       | Plugin modules                                       | `<name>`                                      | `get`, `getAll`, `add`                                               |
| `apis`          | API modules                                          | `<name>`                                      | `get`, `getAll`, `add`                                               |
| `custom-fields` | Custom field definitions                             | `plugin::<plugin>.<name>` or `global::<name>` | `get`, `getAll`, `add`                                               |
| `models`        | Extra database models (core store, webhooks, others) | none, it is a list                            | `add`, `get`                                                         |
| `sanitizers`    | Sanitizer lists by path                              | lodash path, for example `content-api.input`  | `get`, `add`, `set`, `has`                                           |
| `validators`    | Validator lists by path                              | lodash path                                   | `get`, `add`, `set`, `has`                                           |

### Registry operations

The method names are shared, but the behavior differs per registry.

- **`add`** registers many entries under one namespace. Most registries throw on a duplicate UID. The `hooks` registry does not check duplicates: its `add` calls `set`. The `components` registry takes a map keyed by full UID, with no namespace argument.
- **`get`** returns one entry. For `services` and `controllers`, the first `get` calls the factory with `{ strapi }` and caches the instance. For an unknown UID, most registries return `undefined`. `custom-fields` throws. `sanitizers` and `validators` return an empty array. The `policies` registry also accepts `{ pluginName, apiName }` and tries `plugin::<pluginName>.<name>` or `api::<apiName>.<name>` when the full name does not match.
- **`getAll(namespace)`** filters by namespace. For `services` and `controllers`, it returns lazy getters, so it does not instantiate anything.
- **`set`** writes one entry and overwrites the old one. For `services` and `controllers`, it also removes the cached instance. The `components` registry is the exception: its `set` throws on a duplicate.
- **`extend(uid, fn)`** throws if the UID is unknown. For `services` and `controllers`, it calls `get` (which instantiates the factory), then caches `fn(instance)` as the new instance. The factory does not change. For `middlewares` and `hooks`, it replaces the stored value with `fn(value)`. For `content-types`, it calls `fn(schema)` and ignores the return value, so `fn` must change the schema in place.

:::caution
For `services` and `controllers`, `set` after `extend` drops the extension, because `set` removes the cached instance.
:::

:::caution
In the `sanitizers` and `validators` registries, `add(path, fn)` pushes to the list at `path`. If no list exists at `path`, `get` returns a new empty array that is not stored, and the entry is lost. The loaders create the `content-api` lists before any plugin code runs.
:::

## Namespaces and UIDs

`registries/namespace.ts` builds UIDs with one rule:

- If the namespace ends with `::`, the name follows it directly: `global::` + `is-owner` gives `global::is-owner`.
- Otherwise, a dot separates them: `plugin::upload` + `file` gives `plugin::upload.file`.

`@strapi/types` encodes the same rule. Scoped namespaces (`api::<name>`, `plugin::<name>`) use `.`. The other namespaces (`admin`, `strapi`, `global`) use `::`.

| Artifact                         | Example UID                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------- |
| API content type or service      | `api::article.article`                                                       |
| Plugin content type              | `plugin::upload.file`                                                        |
| Plugin service                   | `plugin::users-permissions.user`                                             |
| Admin content type               | `admin::user`                                                                |
| Component                        | `shared.seo` (category and name, no namespace)                               |
| Application policy or middleware | `global::is-owner`                                                           |
| Internal middleware              | `strapi::cors`                                                               |
| Core hook                        | `strapi::content-types.beforeSync`                                           |
| Custom field                     | `plugin::color-picker.color`, or `global::<name>` when the plugin is unknown |

A module reads its own artifacts without the namespace. `strapi.plugin('upload').service('upload')` reads `plugin::upload.upload` from the `services` registry. `module.services` returns the map with the namespace removed from the keys.

The content-types registry also checks that each key equals the schema `info.singularName`. It throws if they differ.

## Folder roles in `@strapi/core`

| Folder            | Role                                                                                                                                      | Signal                                                                       |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/providers/`  | Internal lifecycle units. They add subsystems to the container and take part in `register`, `bootstrap` and `destroy`.                    | Exports `init`, `register`, `bootstrap` or `destroy`.                        |
| `src/registries/` | Stores for named artifacts, with namespace rules and replacement methods.                                                                 | Exports `add`, `get`, `getAll`, and sometimes `set` or `extend`.             |
| `src/loaders/`    | Read the file system and the enabled plugins, then fill the registries.                                                                   | Called from `loadApplicationContext()`.                                      |
| `src/domain/`     | Wrappers that turn raw input into runtime objects: `module` (raw module to runtime module) and `content-type` (definition to schema).     | Called by registries.                                                        |
| `src/services/`   | Implementations of core subsystems: Document Service, event hub, webhooks, HTTP server, entity validator, Content API helpers and others. | Mounted in the container by `Strapi` or by a provider, or imported directly. |

:::caution
"Services" has two meanings. The `services` registry (`src/registries/services.ts`) holds the services of plugins, APIs and the application. You read it with `strapi.service(uid)`. The folder `src/services/**` holds core implementation code. Most of it is mounted in the container or imported directly. It is not in the `services` registry.
:::

## Code map

| Concern                           | Path                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container                         | [`packages/core/core/src/container.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/container.ts)                                 |
| Internal services and getters     | [`packages/core/core/src/Strapi.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/Strapi.ts)                                       |
| Registries added to the container | [`packages/core/core/src/providers/registries.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/providers/registries.ts)           |
| Registry list                     | [`packages/core/core/src/registries/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/index.ts)                   |
| Namespace rule                    | [`packages/core/core/src/registries/namespace.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/namespace.ts)           |
| Services registry                 | [`packages/core/core/src/registries/services.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/services.ts)             |
| Content-types registry            | [`packages/core/core/src/registries/content-types.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/content-types.ts)   |
| Policies registry                 | [`packages/core/core/src/registries/policies.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/policies.ts)             |
| Custom-fields registry            | [`packages/core/core/src/registries/custom-fields.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/custom-fields.ts)   |
| Module wrapper                    | [`packages/core/core/src/domain/module/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/domain/module/index.ts)             |
| Content-type wrapper              | [`packages/core/core/src/domain/content-type/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/domain/content-type/index.ts) |
| Admin artifacts under `admin::`   | [`packages/core/core/src/loaders/admin.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/admin.ts)                         |
| Namespace types                   | [`packages/core/types/src/internal/namespace.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/internal/namespace.ts)             |
| Container type                    | [`packages/core/types/src/core/container.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/types/src/core/container.ts)                     |

## Related

- [Server lifecycle](./02-server-lifecycle.md)
- [Extension points](./04-extension-points.md)
- [Glossary](./09-glossary.md)
- [`@strapi/core` package](../packages/core/core/index.md)
