---
title: Recommended security defaults
tags:
  - configuration
  - security
---

# Recommended security defaults

New Strapi applications scaffolded with `create-strapi-app` ship with the following security-oriented defaults. Existing projects can adopt the same values in `config/api` and `config/plugins`.

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

Use short-lived access tokens with refresh rotation instead of long-lived legacy JWTs.

`config/plugins.js` / `config/plugins.ts`:

```js
module.exports = () => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
    },
  },
});
```

See [JWT management modes](https://docs.strapi.io/cms/features/users-permissions#jwt-management-modes) for client integration details.

## Upload MIME restrictions

Block common executable and shell-script MIME types while leaving other uploads unrestricted. Projects with stricter needs can switch to an `allowedTypes` allowlist instead of (or in addition to) `deniedTypes`.

`config/plugins.js` / `config/plugins.ts`:

```js
module.exports = () => ({
  upload: {
    config: {
      security: {
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
