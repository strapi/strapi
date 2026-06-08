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
- `cache.enabled`: enables file-based cache for generated output.
- `cache.maxAgeMs`: cache validity in milliseconds.
- `cache.filePath`: output file path for cached spec (absolute or app-root relative).

### Access control

Both endpoints are disabled by default and must be explicitly opted into.

When enabled, access is handled by Strapi's standard authentication:

- **Content API** (`/api/openapi.json`): requires an authenticated Content API caller (a
  users-permissions user or an API token).
- **Admin** (`/admin/openapi.json`): requires an authenticated admin user.

Exposing API specs can be sensitive in some deployments, so review who can reach each endpoint before
enabling it.

> Fine-grained, permission-based access control (including making the Content API spec publicly readable
> through the users-permissions **Public** role) is added in a follow-up change.
