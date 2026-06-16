# single-file — Strapi as a primitive

A complete headless Strapi app defined in **one file** via `defineApp(...)`,
started with `startStrapi(app)`.

There is **no** `config/**`, **no** `src/api/**`, and **no** `package.json`
plugin scan. The programmatic definition is the single source of truth.

## Authoring shape (TypeScript)

This is what you write — fully typed, validated at startup:

```ts
import { defineApp, defineConfig } from '@strapi/strapi';
import * as is from '@strapi/strapi/attributes';
import { recommendedPlugins } from '@strapi/strapi/plugins';

export default defineApp({
  config: defineConfig({
    database: {
      connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
    },
    // The admin server always loads, so its secrets are required even headless.
    admin: {
      apiToken: { salt: process.env.API_TOKEN_SALT },
      auth: { secret: process.env.ADMIN_JWT_SECRET },
      transfer: { token: { salt: process.env.TRANSFER_TOKEN_SALT } },
    },
  }),

  // Imported and added explicitly — nothing is scanned.
  plugins: recommendedPlugins(),

  contentTypes: [
    {
      singularName: 'article', // explicit naming — no auto-pluralization
      pluralName: 'articles',
      displayName: 'Article',
      attributes: {
        title: is.string({ required: true }),
        content: is.text(),
      },
      // api defaults to `true` -> REST CRUD auto-generated at /api/articles.
    },
  ],

  routes: ({ post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],

  bootstrap({ strapi }) {
    strapi.log.info('Hello from the bootstrap function!');
  },
});
```

> **Runtime note (Phase 1):** programmatic apps run under **CommonJS** today.
> The published `.mjs` bundles use bare directory imports (e.g. `lodash/fp`)
> that Node's strict ESM resolver rejects, so ESM-native execution is deferred
> to a later packaging pass. This folder therefore ships the runnable app as
> `index.cjs` / `start.cjs` (identical to the snippet above).

## Run

```bash
yarn install
yarn start
```

`startStrapi` boots a **headless** API server (no admin panel build in Phase 1).

## What you get

- Auto-CRUD REST API for the `article` content type at `/api/articles`
  (`api` defaults to `true`). These routes are **auth-gated** by default — grant
  permissions (via the users-permissions plugin) or use an API token to access
  them, exactly like a file-based app.
- A custom **public** route: `POST /api/echo` returns `{ youSent: <body> }`.
- A `bootstrap` lifecycle that logs on startup.

```bash
# Custom public route
curl -X POST http://localhost:1337/api/echo \
  -H 'Content-Type: application/json' \
  -d '{"ping":"pong"}'
# -> {"youSent":{"ping":"pong"}}
```

## Plugin requirements (findings)

A _true_ zero-plugin boot is **not** possible: the always-on admin server
registers routes (e.g. `/forgot-password`) that depend on the
`plugin::email.rateLimit` middleware, so **`email` is the hard minimum**.
**`i18n`** is additionally required whenever a content type uses auto-CRUD
(`api: true`), because REST route generation reads `strapi.plugin('i18n')`.
`recommendedPlugins()` bundles both (and the rest of the familiar set).

## Tests

```bash
yarn test
```

Runs `integration.test.cjs`, which boots the app in isolated child processes and
asserts the custom route, auth-gated auto-CRUD, document-service CRUD + schema
sync, a `fromDisk(...)` content type, and the minimal-plugin boot.
