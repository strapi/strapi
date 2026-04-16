# @strapi/plugin-cache-provider-redis

Official **Redis** implementation of the Strapi [cache manager](https://docs.strapi.io) `CacheProvider` API. It registers the provider name `redis` on `cacheProviderRegistry` so you can use it via `server.cache`.

**Naming pattern:** `@strapi/plugin-cache-provider-<backend>` — use the same convention for other first-party cache backends (for example Memcached).

In this monorepo the package lives under [`packages/plugins/caching-provider-redis/`](https://github.com/strapi/strapi/tree/main/packages/plugins/caching-provider-redis) (folder name uses **`caching`** so Jest’s `modulePathIgnorePatterns` entry for `.cache` does not match a `/cache` segment in `cache-provider-*` paths).

## Install

```bash
yarn add @strapi/plugin-cache-provider-redis
```

## Enable

`config/plugins.js` (or `.ts`):

```js
module.exports = () => ({
  'cache-provider-redis': {
    enabled: true,
  },
});
```

## Configure

`config/server.js` — set the default provider and Redis connection under `server.cache.providers.redis`:

```js
module.exports = ({ env }) => ({
  server: {
    cache: {
      defaultProvider: 'redis',
      providers: {
        redis: {
          connection: { url: env('REDIS_URL', 'redis://127.0.0.1:6379') },
          keyPrefix: 'myapp:',
        },
      },
    },
  },
});
```

- **`connection`**: Redis URL string, or `{ url: '...' }`, or an [ioredis options](https://github.com/redis/ioredis#connect-to-redis) object (`host`, `port`, `password`, `tls`, etc.).
- **`keyPrefix`**: Optional prefix for every Redis key (default `strapi:cache:`).

You can keep the default in-memory provider for some calls:

```ts
await strapi.cacheManager.get('ns', 'key', { provider: 'memory' });
```

## Uninstall

```bash
yarn remove @strapi/plugin-cache-provider-redis
```

Remove the plugin from `config/plugins`, remove or adjust `server.cache` (especially `defaultProvider` and `providers.redis`), then restart Strapi.

## Troubleshooting

- **Connection errors**: Check `REDIS_URL`, firewall, and TLS settings. For managed Redis, use the provider’s URL and enable TLS in `connection` if required.
- **Wrong app data**: Use a distinct **`keyPrefix`** per environment or tenant.
