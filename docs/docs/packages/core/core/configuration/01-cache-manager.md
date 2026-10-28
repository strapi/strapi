---
title: Cache manager
description: Pluggable cache API (memory and database providers), provider registry for plugins, and server.cache configuration.
sidebar_position: 1
tags:
  - configuration
  - core
  - plugins
---

# Cache manager

## Summary

Strapi exposes a **cache manager** (`strapi.cacheManager`) backed by **pluggable cache providers**. The default provider is **in-memory**; a **database** provider persists entries in an internal table. Plugins can **register additional providers** (for example Redis) and select them via `server.cache` or per-call options.

The shape is similar to **SessionManager** (provider + facade), but cache providers are **configurable** and **extensible** without forking core.

Implementation lives in the monorepo at [`packages/core/core/src/services/caching/`](https://github.com/strapi/strapi/tree/main/packages/core/core/src/services/caching). The directory is named `caching`, not `cache` ([see Tests and tooling](#tests-and-tooling)).

## Concepts

| Piece                                                    | Role                                                                                                                          |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `CacheManagerService` (`strapi.cacheManager`)            | `get` / `set` / `delete` with **namespace** and **key**; optional per-call **`provider`** override; **`expiresAt`** on `set`. |
| `CacheProvider`                                          | Low-level storage (memory `Map`, SQL rows, etc.).                                                                             |
| `CacheProviderRegistry` (`strapi.cacheProviderRegistry`) | Named provider factories. Core registers `memory` and `database`; plugins call `register()` in `register()`.                  |
| Internal model `strapi::cache-entry`                     | Used by the database provider only; registered with `strapi.get('models').add()` like other internal metadata models.         |

Use a stable **namespace** per feature (for example `plugin::my-plugin::feature`). Keys are opaque strings.

## Server cache configuration

Defaults are merged in core (`defaultProvider: 'memory'`, `providers: {}`). Override under **`server.cache`** in `config/server.js` (or `.ts`):

```js
module.exports = ({ env }) => ({
  server: {
    cache: {
      defaultProvider: 'memory',
      providers: {
        memory: {},
        database: {},
      },
    },
  },
});
```

- **`defaultProvider`**: name of a registered provider (`memory`, `database`, or a plugin-registered name).
- **`providers`**: optional bag per provider name; values are passed to that provider’s factory as `options` (see [Registering a custom provider](#registering-a-custom-provider)).

Types: [`ServerCache`](https://github.com/strapi/strapi/blob/main/packages/core/types/src/core/config/server.ts) on `server.cache`.

## Built-in providers

### `memory`

- Process-local `Map`; fastest; not shared across processes or replicas.
- Expired entries are dropped on **`get`**.
- Prefer **JSON-serializable** values if you may switch to the database provider.

### `database`

- Table **`strapi_cache_entries`**, model uid **`strapi::cache-entry`**: `namespace`, `key`, `value` (JSON), `expiresAt`, `createdAt`, `updatedAt`.
- **`set`** upserts; **`get`** removes expired rows.
- Requires a working DB connection and synced schema for the internal model.

## Application API

```ts
import type { Modules } from '@strapi/types';

const cache: Modules.Cache.CacheManagerService = strapi.cacheManager;

await cache.set('my-feature', 'user:123', { lastSeen: Date.now() }, { expiresAt: someDate });

const entry = await cache.get('my-feature', 'user:123');

await cache.delete('my-feature', 'user:123');

await cache.get('my-feature', 'user:123', { provider: 'memory' });
```

Types: [`packages/core/types/src/modules/cache.ts`](https://github.com/strapi/strapi/blob/main/packages/core/types/src/modules/cache.ts).

## Official Redis provider

Install the first-party package (naming pattern for cache backends: `@strapi/plugin-cache-provider-<name>`):

```bash
yarn add @strapi/plugin-cache-provider-redis
```

Enable it in `config/plugins` (plugin id `cache-provider-redis`), then point `server.cache` at Redis:

```js
// config/plugins.js
module.exports = () => ({
  'cache-provider-redis': { enabled: true },
});

// config/server.js
module.exports = ({ env }) => ({
  server: {
    cache: {
      defaultProvider: 'redis',
      providers: {
        redis: {
          connection: { url: env('REDIS_URL', 'redis://127.0.0.1:6379') },
        },
      },
    },
  },
});
```

See the package [README](https://github.com/strapi/strapi/blob/main/packages/plugins/caching-provider-redis/README.md) for `keyPrefix`, TLS, and uninstall notes.

## Registering a custom provider

In the plugin **`register()`** hook, register a factory that receives `{ strapi, options }` and returns a `CacheProvider`:

```ts
export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    strapi.get('cacheProviderRegistry').register('my-provider', ({ options }) => {
      return createMyCacheProvider(options);
    });
  },
};
```

`options` is `strapi.config.get('server.cache')?.providers?.my-provider ?? {}`.

Set `server.cache.defaultProvider` to your provider name and/or pass `{ provider: 'my-provider' }` on individual calls. Register **before** anything uses that provider as the default.

## Wiring in core

The [`caching` provider](https://github.com/strapi/strapi/blob/main/packages/core/core/src/providers/caching.ts) runs after the provider that exposes `models`. It:

1. Registers `memory` and `database` on the registry.
2. Adds the `strapi::cache-entry` model.
3. Registers `cacheProviderRegistry` (eager) and `cacheManager` (lazy singleton).

## Tests and tooling

:::info Jest and paths containing `/cache`
Jest’s `modulePathIgnorePatterns` includes `.cache`, which matches path segments such as **`/cache`**. Do not place unit tests or imports under a directory literally named `cache` in this monorepo; core uses the folder name **`caching`** and test filenames like **`caching-*.test.ts`**.
:::

## Related documentation

- [Configuration introduction](./00-intro) — how config files are loaded.
- [Sessions and JWT](../authentication/00-sessions-and-jwt) — authentication tokens and `SessionManager` (separate from cache providers).
- [Event Hub](../strapi/event-hub) — another core service registered during bootstrap.
