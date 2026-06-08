# @strapi/openapi

`@strapi/openapi` provides the core OpenAPI generation pipeline used by Strapi.

## Generate a specification

You can generate a document from the CLI:

```bash
strapi openapi generate
```

This command generates a `content-api` specification by default.

## Expose `/openapi.json` from the server

Strapi can expose a generated OpenAPI document over HTTP using the core generator.

Add `server.openapi` config in your app:

```js
// config/server.js
module.exports = () => ({
  openapi: {
    'content-api': {
      enabled: true,
      route: {
        path: '/openapi.json',
      },
      access: {
        mode: 'authenticated', // public | authenticated
      },
      cache: {
        enabled: true,
        maxAgeMs: 60_000,
        filePath: '.strapi/openapi/content-api.json',
      },
    },
    admin: {
      enabled: false,
      route: {
        path: '/openapi.json',
      },
      access: {
        mode: 'authenticated',
      },
      cache: {
        enabled: true,
        maxAgeMs: 60_000,
        filePath: '.strapi/openapi/admin.json',
      },
    },
  },
});
```

### Options

- `server.openapi['content-api']`: config for the Content API OpenAPI endpoint.
- `server.openapi.admin`: config for the Admin API OpenAPI endpoint.
- `enabled`: enables the endpoint when `true`.
- `route.path`: endpoint subpath to register (resolved under `/api` for content-api and under `/admin` for admin by default).
- `access.mode`: endpoint access mode (`public`, `authenticated`).
- `cache.enabled`: enables file-based cache for generated output.
- `cache.maxAgeMs`: cache validity in milliseconds.
- `cache.filePath`: output file path for cached spec (absolute or app-root relative).

### Security note

By default, endpoints use `authenticated` access mode. You can explicitly set `public` for unauthenticated
access. Exposing API specs may still be sensitive in some deployments, so both endpoints are disabled by
default and should be explicitly opted into.
