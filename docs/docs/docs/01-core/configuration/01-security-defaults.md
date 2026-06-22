---
title: Recommended security defaults
tags:
  - configuration
  - security
---

# Recommended security defaults

New Strapi applications scaffolded with `create-strapi-app` ship with the following security-oriented defaults. Existing projects can adopt the same values in `config/api`, `config/plugins`, and `config/server`.

## Strict API parameters

Reject unrecognized query and document-service parameters so typos and injection-style keys fail fast instead of being silently ignored.

`config/api.js` / `config/api.ts`:

```js
module.exports = {
  rest: {
    strictParams: true,
  },
  documents: {
    strictParams: true,
  },
};
```

See also: [strictParams and registerParam](https://www.notion.so/strapi/strictParams-and-register-Param-2f78f359807480fbaaebfeaf08ba74a3).

## Content API authentication (refresh tokens)

Use short-lived access tokens with refresh rotation instead of long-lived legacy JWTs. Store refresh tokens in httpOnly cookies when clients support cookie-based auth.

`config/plugins.js` / `config/plugins.ts`:

```js
module.exports = () => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
});
```

Scaffolded `.env` files include a randomly generated `JWT_SECRET` alongside other secrets.

See [JWT management modes](https://docs.strapi.io/cms/features/users-permissions#jwt-management-modes) for client integration details.

## Upload MIME restrictions

Use an allowlist for common media and document types, plus a denylist for executables and shell scripts. When both are set, denied types take precedence over the allowlist.

`config/plugins.js` / `config/plugins.ts`:

```js
module.exports = () => ({
  upload: {
    config: {
      security: {
        allowedTypes: [
          'image/*',
          'video/*',
          'audio/*',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.*',
          'text/plain',
          'text/csv',
        ],
        deniedTypes: [
          'application/vnd.microsoft.portable-executable',
          'application/x-msdownload',
          'application/x-msdos-program',
          'application/x-executable',
          'application/x-dosexec',
          'application/x-sh',
          'text/x-shellscript',
          'application/x-mach-binary',
        ],
      },
    },
  },
});
```

See [MIME type validation](/upload/mime-validation) for how allow/deny lists are evaluated.

### SVG uploads

SVG files (`image/svg+xml`) are allowed by the default allowlist because many sites use them for logos and icons. SVG can embed scripts and pose an XSS risk when served from the same origin as your app. Consider denying `image/svg+xml`, serving uploads from a separate domain or CDN, or sanitizing SVGs before storage.

## Webhook payloads

Limit relation data in webhook payloads to reduce accidental data exposure:

`config/server.js` / `config/server.ts`:

```js
module.exports = ({ env }) => ({
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});
```

## CORS in production

The `strapi::cors` middleware defaults to `origin: '*'` with `credentials: true`, which suits local development but is too permissive for production. Restrict `origin` to your frontend URL(s) in `config/middlewares`:

```js
module.exports = [
  // ...
  {
    name: 'strapi::cors',
    config: {
      origin: ['https://your-frontend.example'],
      credentials: true,
    },
  },
  // ...
];
```

## Other production hardening

- Enable **database SSL** for managed PostgreSQL or MySQL (`DATABASE_SSL=true`).
- Set **`server.proxy: true`** when running behind a reverse proxy so secure cookies and client IPs work correctly.
- Use **HTTPS** for remote data transfer (`strapi transfer --from` / `--to`).
