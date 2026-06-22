# embedding — Programmatic Strapi in existing hosts

Recipes for running a programmatic Strapi instance **inside** an existing Koa,
Express, or Next.js server — without calling `startStrapi()`, which owns the HTTP
port.

## The pattern

1. **`loadStrapi(app)`** — boots Strapi (`register` → `bootstrap`) and mounts
   routes/middleware on `strapi.server.app`, but does **not** call `listen()`.
2. **Your host owns the port** — delegate matching requests to
   `strapi.server.app.callback()` (Node's `(req, res) => void` handler).

```js
const { loadStrapi } = require('@strapi/strapi');
const app = require('./app.cjs');

const strapi = await loadStrapi(app, { serveAdminPanel: false });
// strapi.server.app.callback() is ready — mount it in your host (see below)
```

`startStrapi(app)` remains the one-liner when Strapi should own the port. Use
`loadStrapi` only when embedding.

### Path prefixes

Strapi routes are registered at their normal paths (`/api/...`, `/admin/...`,
`/_health`). When mounting under a prefix (e.g. `/strapi`), the host must strip
that prefix before calling `callback()` — Express does this automatically with
`app.use('/strapi', strapi.server.app.callback())`. For Koa, either delegate only
the paths Strapi owns (see `koa-host.cjs`) or rewrite `ctx.url` before invoking
the handler.

## Files

| File               | Purpose                                                                  |
| ------------------ | ------------------------------------------------------------------------ |
| `app.cjs`          | Shared `defineApp(...)` definition (minimal, `email` only, `api: false`) |
| `koa-host.cjs`     | Koa host — delegates `/api`, `/admin`, `/_health` to Strapi              |
| `express-host.cjs` | Express host — mounts Strapi at `/strapi`                                |
| `next-host.cjs`    | Next.js custom server — Strapi at `/strapi`, everything else to Next     |
| `next/`            | Minimal Next.js pages app for the custom-server recipe                   |

## Run

```bash
yarn install
yarn start:koa       # http://127.0.0.1:3100
yarn start:express   # http://127.0.0.1:3101  (Strapi under /strapi)
yarn start:next      # http://127.0.0.1:3102  (Next home + Strapi under /strapi)
```

### Try the routes

```bash
# Koa — Strapi at root paths
curl http://127.0.0.1:3100/health
curl -X POST http://127.0.0.1:3100/api/echo \
  -H 'Content-Type: application/json' -d '{"ping":"pong"}'

# Express / Next — Strapi under /strapi
curl http://127.0.0.1:3101/health
curl -X POST http://127.0.0.1:3101/strapi/api/echo \
  -H 'Content-Type: application/json' -d '{"ping":"pong"}'
```

## Tests

```bash
yarn test
```

Runs `integration.test.cjs`, which boots `loadStrapi` and both Koa/Express hosts
in isolated child processes and asserts host-owned routes plus the embedded
`POST /api/echo` route.

The Next.js recipe is documented and runnable via `yarn start:next` but is not
part of the automated integration suite (Next `prepare()` is too heavy for the
fast in-process harness).

## Notes

- **CommonJS runtime (Phase 1):** same as `examples/single-file` — sources are
  `.cjs` because programmatic apps run under CommonJS today.
- **Admin secrets** are required even headless because the admin server always
  loads. Read them from environment variables in a real app.
- **Shutdown:** call `await strapi.destroy()` when your host shuts down (see
  `next-host.cjs` for a `SIGINT`/`SIGTERM` example).
