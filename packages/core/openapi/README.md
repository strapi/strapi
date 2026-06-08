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

Both endpoints are disabled by default and must be explicitly opted into. There is no access
configuration: enabling an endpoint exposes it with a fixed access policy.

- **Content API** (`/api/openapi.json`): **public** when enabled. The document describes the public
  Content API, so the spec is served without authentication.
- **Admin** (`/admin/openapi.json`): requires an authenticated admin user.

Exposing API specs can be sensitive in some deployments, so only enable the endpoint you need.

> Fine-grained, permission-based access control (RBAC for the admin endpoint, and gating the Content API
> spec behind a permission that can be granted to the users-permissions **Public** role) is added in a
> follow-up change. When that lands, a public Content API spec will require granting that permission to
> the Public role.
