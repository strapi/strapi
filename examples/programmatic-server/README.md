# programmatic-server — Strapi as a primitive (minimal host + browser smoke test)

The smallest possible host: a **single file** (`index.cjs`) that _defines_ a
Strapi app with `defineApp(...)` and _starts_ it with `startStrapi(...)`. No
`config/**`, no `src/api/**`, no `package.json` plugin scan — the programmatic
definition is the single source of truth.

It ships with a **Playwright smoke test** that boots this exact server and drives
a real browser against it, so we have proof the programmatic host serves real
HTTP in a real browser.

## Run the server

```bash
yarn install
yarn start            # node index.cjs  (PORT/HOST overridable)
```

`startStrapi` boots a **headless** API server (no admin panel in Phase 1).

What it exposes:

- `GET /api/hello` — a tiny **public** HTML page (so a browser has something to
  render).
- `POST /api/echo` — a **public** JSON route returning `{ youSent: <body> }`.
- `/api/articles` — auto-CRUD for the `article` content type, **auth-gated** by
  default (like a file-based app).

```bash
curl http://localhost:1337/api/hello
curl -X POST http://localhost:1337/api/echo -H 'Content-Type: application/json' -d '{"ping":"pong"}'
# -> {"youSent":{"ping":"pong"}}
```

## Run the browser smoke test

```bash
yarn test:e2e
```

This uses `playwright.config.ts`, whose `webServer` boots `node index.cjs` and
waits for `GET /api/hello` before running `e2e/smoke.spec.ts` in chromium. The
test asserts:

1. the public HTML route **renders in a real browser** (title + visible text),
2. the public JSON echo route responds `200` with the echoed body,
3. auto-CRUD routes are **mounted and secure by default** (`401`).

> **Always run Playwright with a timeout** so a hung browser/server can't get you
> stuck — e.g. `yarn test:e2e -- --global-timeout=240000` (the `webServer` also
> has its own 180s boot timeout in the config).

### Why this is separate from `tests/e2e`

The main `tests/e2e` harness generates a full scaffolded app and **builds the
admin panel**, then logs in through it. A programmatic app is **headless** (no
admin panel in Phase 1), so this smoke test is intentionally self-contained: it
boots the programmatic server directly and exercises its HTTP surface in a real
browser.

## Notes

- **CommonJS runtime (Phase 1):** programmatic apps run under CommonJS today —
  the published `.mjs` bundles use bare directory imports Node's strict ESM
  resolver rejects. See `examples/single-file/README.md` for details.
- **Admin secrets** are required even headless because the admin server always
  loads. Read them from environment variables in a real app.
