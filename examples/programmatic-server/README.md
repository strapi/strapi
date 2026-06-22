# programmatic-server — Programmatic Strapi (host + admin panel + browser smoke test)

A minimal host defined in code with **no `config/**`, no `src/api/**`, no
`package.json` plugin scan** — the programmatic definition is the single source
of truth. Three small files:

- **`app.ts`** — _defines_ the app with `defineApp(...)` (the source of truth).
- **`index.ts`** — _starts_ it with `startStrapi(app)`.
- **`build-admin.ts`** — _builds the admin panel_ with `buildAdmin({ app })`
  (Phase 2).

It ships with a **Playwright smoke test** that builds the panel from the
programmatic definition, boots the server, and drives a real browser against it
— proof the programmatic host serves real HTTP **and a working admin panel** in a
real browser.

## Run the server

```bash
yarn install
yarn start            # tsc && node dist/index.js  (PORT/HOST overridable)
```

`startStrapi(app)` serves the admin **panel** automatically when a build exists
at `<cwd>/build` (produced by `yarn build:admin`), and stays **headless**
otherwise — the admin server module always loads either way.

The sources are authored in TypeScript and compiled to CommonJS (`yarn build` →
`dist/`) before they run — see the note on the CommonJS runtime below.

What it exposes:

- `GET /api/hello` — a tiny **public** HTML page (so a browser has something to
  render).
- `POST /api/echo` — a **public** JSON route returning `{ youSent: <body> }`.
- `/api/articles` — auto-CRUD for the `article` content type, **auth-gated** by
  default (like a file-based app).
- `/admin` — the admin **panel**, once built (see below). The `article` content
  type is **read-only** in the Content-Type Builder because it is defined in
  code, not on disk.

```bash
curl http://localhost:1337/api/hello
curl -X POST http://localhost:1337/api/echo -H 'Content-Type: application/json' -d '{"ping":"pong"}'
# -> {"youSent":{"ping":"pong"}}
```

## Build the admin panel

```bash
yarn build:admin      # tsc && node dist/build-admin.js
```

`buildAdmin({ app })` is the Phase 2 façade over Strapi's node build pipeline. It
takes the `defineApp(...)` definition directly (no file scan) and derives the
frontend plugin set from `app.plugins` — each `recommendedPlugins()` entry
carries a `resolve` hint so the builder knows which `strapi-admin` entry to
bundle. The compiled panel lands in `<cwd>/build`, which `startStrapi` then
serves at `/admin`.

## Run the browser smoke test

```bash
yarn test:e2e
```

`test:e2e` runs `tsc`, then `node dist/build-admin.js` (build the panel), then
Playwright. Its `webServer` boots the compiled `node dist/index.js` and waits for
`GET /api/hello` before running `e2e/smoke.spec.ts` in chromium. The test asserts:

1. the public HTML route **renders in a real browser** (title + visible text),
2. the public JSON echo route responds `200` with the echoed body,
3. auto-CRUD routes are **mounted and secure by default** (`401`),
4. the **admin panel** — built from the programmatic definition — renders in a
   real browser (title, mounted SPA, first-run registration form).

> **Always run Playwright with a timeout** so a hung browser/server can't get you
> stuck — e.g. `yarn test:e2e -- --global-timeout=240000` (the `webServer` also
> has its own 180s boot timeout in the config).

### Why this is separate from `tests/e2e`

The main `tests/e2e` harness generates a full scaffolded app and logs in through
the admin. This smoke test is intentionally self-contained: it builds the admin
panel **from a programmatic definition** with `buildAdmin`, boots the server with
`startStrapi`, and exercises both the HTTP surface and the panel in a real
browser.

## Notes

- **TypeScript → CommonJS (Phase 1 runtime):** the source is TypeScript, but
  programmatic apps run under CommonJS today — the published `.mjs` bundles use
  bare directory imports Node's strict ESM resolver rejects. So `tsconfig.json`
  compiles with `module: NodeNext` in a CommonJS package (no `"type": "module"`),
  emitting `require`-based output to `dist/`. Running the sources directly (e.g.
  via Node's native type stripping) would execute them as ESM and fail. See
  `examples/single-file/README.md` for the underlying detail.
- **Admin secrets** are required even headless because the admin server always
  loads. Read them from environment variables in a real app.
