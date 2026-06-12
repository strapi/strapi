# @strapi/openapi

`@strapi/openapi` provides the core OpenAPI generation pipeline used by Strapi.

## Generate a specification

You can generate a document from the CLI:

```bash
strapi openapi generate
```

This command generates a `content-api` specification by default.

## Expose `/openapi.json` from the server

Strapi can expose a generated OpenAPI document over HTTP. Both endpoints are
disabled by default; opt in per endpoint via `server.openapi`:

```js
// config/server.js
module.exports = () => ({
  openapi: {
    'content-api': {
      // 'disabled' (default) | 'public'
      access: 'public',
      route: {
        path: '/openapi.json',
      },
      cache: {
        enabled: true,
        maxAgeMs: 60_000,
        filePath: '.strapi/openapi/content-api.json',
      },
    },
    admin: {
      // 'disabled' (default) | 'authenticated' ('public' is not allowed)
      access: 'authenticated',
      route: {
        path: '/openapi.json',
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
- `access`: controls exposure and protection in a single setting (default `disabled`). See below.
- `route.path`: endpoint subpath to register (resolved under `/api` for content-api and under `/admin` for admin by default).
- `cache.enabled`: enables file-based cache for generated output.
- `cache.maxAgeMs`: cache validity in milliseconds.
- `cache.filePath`: output file path for cached spec (absolute or app-root relative).

### Access control

A single `access` value per endpoint controls both whether the endpoint exists and how it is protected.
Access is governed by Strapi's existing auth, not by a bespoke access surface:

- `disabled` (default): the endpoint is not registered.
- `public` (**content-api only**): no authentication — anyone can read the spec.
- `authenticated` (**admin only**): requires an authenticated admin (any role). Granular
  per-permission RBAC is intentionally left for a later iteration.

The content-api endpoint is only available as public for now. The admin endpoint is never public.
Unsupported access values throw at startup.

> **Security note:** a `public` content-api spec describes your entire Content API surface — including
> content types that are not publicly readable — to anyone. If you need a gated spec, use the admin
> endpoint with `authenticated`. Review who can reach each endpoint before enabling it.
