---
title: Extension points
description: The mechanisms that plugins and application code use to change Strapi server behavior, in the order in which they apply.
status: draft
review_notes:
  - Drafted from internal research notes on Strapi v5 internals and spot-checked against the code on releases/5.56.0; needs a maintainer review.
  - The page covers the server runtime only. Admin panel extension (StrapiApp register, bootstrap and admin hooks) needs its own page.
---

Plugins and applications change Strapi behavior through a small set of mechanisms. Each mechanism applies at a specific moment of the [server lifecycle](./02-server-lifecycle.md). This page lists them in that order.

| Moment                          | Mechanism                                                                                 | Typical use                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Plugin loading (register phase) | Plugin selection, plugin config merge, `src/extensions`                                   | Turn plugins on, configure them, change a plugin before Strapi creates its module.               |
| Module load (register phase)    | Raw module artifacts go into the registries                                               | A plugin or API declares content types, services, controllers, policies, middlewares and routes. |
| `register` functions            | Registry `set` and `extend`, content-type changes, sync hook handlers, custom fields      | Change schemas or replace artifacts before the database starts.                                  |
| `bootstrap` functions           | Document middlewares, database lifecycle subscribers, event hub listeners, webhook events | Add behavior that needs the database or the server.                                              |

## Plugin selection

The plugins loader builds the list of enabled plugins from three sources:

1. **Always-enabled plugins.** A fixed list in `get-enabled-plugins.ts`: content-manager, content-type-builder, email, upload, i18n, content-releases and review-workflows. A declaration with `enabled: false` in `config/plugins` does not turn them off.
2. **Installed plugins.** Dependencies of the application whose `package.json` has `strapi.kind: 'plugin'`.
3. **Declared plugins.** Entries in `config/plugins.js`, merged with `config/env/<NODE_ENV>/plugins.js`. An entry with `resolve` points to a local folder or a module.

Plugin names must be kebab-case. The loader throws otherwise.

For each enabled plugin, the loader resolves the `strapi-server` export of the package. If the export is missing, it uses `./strapi-server.js`. It skips a plugin that has no server entry.

## Plugin config merge

Each plugin can export `config.default` (an object, or a function that receives `{ env }`) and `config.validator`. The loader then:

1. reads `<plugin>.config` from the user plugin config;
2. merges it with `defaultsDeep`: user values win, and defaults fill the missing keys;
3. calls `config.validator(config)`. If it throws, the loader throws `Error regarding <plugin> config: <message>`;
4. stores the result in `plugin.config`.

At module load, the config service stores this object under the module namespace. Read it with `strapi.plugin('<name>').config('<key>')` or `strapi.config.get('plugin::<name>.<key>')`.

## The `src/extensions` folder

After the config merge, and before Strapi creates the plugin module, the loader applies application overrides from `<distDir>/src/extensions`:

1. **Schema overrides.** `src/extensions/<plugin>/content-types/<name>/schema.json` is merged into the plugin content type with a shallow spread (`{ ...original, ...override }`). A top-level key such as `attributes` replaces the original key as a whole. If the content type does not exist, the loader adds it.
2. **Server override.** `src/extensions/<plugin>/strapi-server.js` exports a function. The loader calls it with the plugin object and uses the return value as the new plugin object.

This mechanism applies to plugins only. It does not apply to APIs or to the admin.

Because the override runs before module creation, every later step sees the changed plugin: registries, lifecycles and routes.

## Registry replacement

In `register` or `bootstrap`, code can replace or wrap entries in the registries. See [Container and registries](./03-container-and-registries.md#registry-operations) for the exact rules.

| Registry                  | Replace                                                           | Wrap                                                                        |
| ------------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `services`, `controllers` | `set(uid, factory)` replaces the factory and clears the instance. | `extend(uid, fn)` instantiates the service and caches `fn(instance)`.       |
| `middlewares`, `hooks`    | `set(uid, value)`                                                 | `extend(uid, fn)` stores `fn(value)`.                                       |
| `content-types`           | `set(uid, schema)`                                                | `extend(uid, fn)` calls `fn(schema)`. `fn` must change the schema in place. |
| `policies`                | `set(uid, policy)`                                                | Not supported.                                                              |
| `components`              | Not supported. `set` throws on a duplicate.                       | Not supported.                                                              |

Content types can also change without the registry methods. In `register`, the database is not initialized, so changes to `strapi.contentTypes[uid].attributes` reach the database schema. The i18n plugin adds the `locale` and `localizations` attributes to every content type this way.

## Hooks registry

A hook is a named list of handlers. `strapi.hook(uid)` returns the hook object from the `hooks` registry, or `undefined`.

Hook objects come from the `hooks` module of `@strapi/utils`. Each object has `register(handler)`, `delete(handler)`, `getHandlers()` and `call(...)`. The factory sets how `call` runs the handlers:

| Factory                          | `call` behavior                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------- |
| `createAsyncSeriesHook`          | Runs handlers one after the other with the same context.                                       |
| `createAsyncSeriesWaterfallHook` | Runs handlers one after the other. Each handler receives the return value of the previous one. |
| `createAsyncParallelHook`        | Runs all handlers at the same time. Each handler receives a deep clone of the context.         |
| `createAsyncBailHook`            | Runs handlers one after the other and returns the first result that is not `undefined`.        |

Core defines two hooks. Both are parallel hooks. The `registries` provider creates them in its `register` step.

- `strapi::content-types.beforeSync` runs before the database schema sync.
- `strapi::content-types.afterSync` runs after it.

Both receive `{ oldContentTypes, contentTypes }`. Core uses them to migrate data when draft and publish or i18n is turned on or off for a content type. The i18n, content-releases and review-workflows plugins also add handlers. Add handlers in `register`, because the hooks run before module `bootstrap`.

:::caution
The local `Hook` type in `registries/hooks.ts` declares a `handlers` property. The objects from `@strapi/utils` expose `getHandlers()` instead.
:::

:::note
The admin panel has its own hooks, created in `StrapiApp` and registered with `registerHook`, for example `Admin/CM/pages/ListView/inject-column-in-table`. They run in the browser. They are not related to the server hooks registry.
:::

## Database lifecycles

`@strapi/database` runs lifecycle subscribers around each entity manager query: `create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, `findOne`, `findMany` and `count`. Each query has a `before*` and an `after*` action.

There are two ways to add a subscriber:

- `strapi.db.lifecycles.subscribe(subscriber)`. A function subscriber receives all events. An object subscriber has action keys (`beforeCreate`, `afterUpdate` and so on) and an optional `models` list of UIDs.
- A `lifecycles` file next to a content-type schema, for example `src/api/article/content-types/article/lifecycles.js`. The built-in models subscriber calls it.

A second built-in subscriber sets `createdAt` and `updatedAt`. Each subscriber gets its own `event.state` object, which carries data from the `before*` call to the `after*` call of the same query. `strapi.db.lifecycles.disable()` and `enable()` turn all subscribers off and on. The data-transfer package uses them.

## Document Service middlewares

`strapi.documents.use(middleware)` adds a middleware to the Document Service. A middleware is `(ctx, next) => result`. `ctx` holds `uid`, `contentType`, `action` (the method name, for example `create` or `publish`) and `params`. The function returns an unregister function.

- Middlewares run for every content type. Filter on `ctx.uid` and `ctx.action`.
- A middleware can change `ctx.params` before it calls `next()`, and it can change or replace the result.
- Middlewares run before the repository opens its transaction.
- The i18n, upload, content-manager (history), content-releases and review-workflows packages add middlewares.

Read [Document write path](./05-document-write-path.md) for where middlewares sit in a write.

## Event hub listeners

`strapi.eventHub.on(name, listener)` adds a listener for one event. `strapi.eventHub.subscribe(fn)` adds a subscriber that receives every event as `(name, ...args)`. `emit` awaits each subscriber and each listener in order. It does not catch errors: if one throws, the next ones do not run for that event. Core emits the document events after the transaction commits. See [Document write path](./05-document-write-path.md#events-and-webhooks).

To offer an event to webhooks, a plugin calls `strapi.get('webhookStore').addAllowedEvent(key, value)`, usually in `bootstrap`.

:::caution
Several unsubscribe helpers use `list.splice(list.indexOf(item), 1)`. If `item` is not in the list, `indexOf` returns `-1` and `splice(-1, 1)` removes the last entry. This applies to `eventHub.off()`, to the function that `strapi.documents.use()` returns and to the function that `strapi.db.lifecycles.subscribe()` returns.

`eventHub.once(name, listener)` registers a wrapper, but the wrapper calls `off(name, listener)` with the original listener. The original is not in the list, so the call removes the last listener for that event. If the wrapper is the last listener, it removes itself and the call looks correct. If another listener was added after it, that listener is removed and the wrapper stays. A local run of the code confirmed this: with `once` then `on`, two emits called the `once` listener twice and the other listener zero times.
:::

## Three hook-like mechanisms compared

|                              | Hooks registry                                                                   | Database lifecycles                                                                      | Document Service middlewares                                     |
| ---------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Package                      | `@strapi/core` registry, hook objects from `@strapi/utils`                       | `@strapi/database`                                                                       | `@strapi/core` Document Service                                  |
| How to add                   | `strapi.hook(uid).register(fn)`                                                  | `strapi.db.lifecycles.subscribe(...)` or a content-type `lifecycles` file                | `strapi.documents.use(fn)`                                       |
| Trigger                      | An explicit `hook.call()` by the owner. Core calls each sync hook once per boot. | Each entity manager query                                                                | Each Document Service method call                                |
| Filter                       | One hook per UID                                                                 | By action, and optionally by model UID                                                   | None. Check `ctx.uid` and `ctx.action`.                          |
| Input                        | Depends on the hook. Core sync hooks pass `{ oldContentTypes, contentTypes }`.   | Database params with row `id` values                                                     | Document params with `documentId`, `status` and `locale`         |
| Change input                 | Parallel hooks pass a clone, so no. Waterfall hooks pass return values forward.  | Yes. Change `event.params` in `before*`.                                                 | Yes. Change `ctx.params` before `next()`.                        |
| Change output                | Waterfall and bail hooks return a value.                                         | Change the `event.result` object in `after*`. It is the object the caller receives.      | Yes. Return a different value.                                   |
| Transaction                  | Not related to transactions                                                      | Inside the caller transaction, if one exists                                             | Outside the repository transaction, unless the caller opened one |
| Calls per document operation | None                                                                             | Many. For example, a publish deletes and creates rows, and each create runs a `findOne`. | One per public method call                                       |

## Code map

| Concern                           | Path                                                                                                                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Enabled plugins                   | [`packages/core/core/src/loaders/plugins/get-enabled-plugins.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/plugins/get-enabled-plugins.ts)                                           |
| User plugin config files          | [`packages/core/core/src/loaders/plugins/get-user-plugins-config.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/plugins/get-user-plugins-config.ts)                                   |
| Config merge and `src/extensions` | [`packages/core/core/src/loaders/plugins/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/loaders/plugins/index.ts)                                                                       |
| Hooks registry                    | [`packages/core/core/src/registries/hooks.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/registries/hooks.ts)                                                                                 |
| Hook factories                    | [`packages/core/utils/src/hooks.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/utils/src/hooks.ts)                                                                                                     |
| Sync hooks creation               | [`packages/core/core/src/providers/registries.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/providers/registries.ts)                                                                         |
| Sync hook core handlers           | [`packages/core/core/src/migrations/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/migrations/index.ts)                                                                                 |
| Database lifecycles               | [`packages/core/database/src/lifecycles/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/lifecycles/index.ts)                                                                         |
| Built-in subscribers              | [`packages/core/database/src/lifecycles/subscribers/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/lifecycles/subscribers/index.ts)                                                 |
| Document middleware manager       | [`packages/core/core/src/services/document-service/middlewares/middleware-manager.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/document-service/middlewares/middleware-manager.ts) |
| Event hub                         | [`packages/core/core/src/services/event-hub.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/event-hub.ts)                                                                             |
| Webhook allowed events            | [`packages/core/core/src/services/webhook-store.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/webhook-store.ts)                                                                     |
| Example: i18n `register`          | [`packages/plugins/i18n/server/src/register.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/i18n/server/src/register.ts)                                                                             |

## Related

- [Server lifecycle](./02-server-lifecycle.md)
- [Container and registries](./03-container-and-registries.md)
- [Document write path](./05-document-write-path.md)
- [Glossary](./11-glossary.md)
