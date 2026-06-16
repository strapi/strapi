# RFC: Programmatic Strapi

> Status: **Draft / Phase 1 design agreed — implementation not started**
> Branch: `feat/import-strapi`
>
> This is the narrative source of truth. A structured C4 view, per-decision ADRs, and
> the implementation checklist derived from it live in
> [`docs/rfc/programmatic-strapi/`](./programmatic-strapi/README.md).

## Summary

Make Strapi usable as a **programmatic library** — something you `import` and wire up
inside your own Node project — in addition to the existing "scaffolded app you run
with the CLI" experience.

A developer should be able to define an entire Strapi app in TypeScript, with **no
hidden conventions**. Because the programmatic surface is brand new, it does _not_
inherit legacy magic (e.g. automatic singular→plural). Users are explicit.

```ts
import { defineApp, defineConfig } from '@strapi/strapi';
import * as is from '@strapi/strapi/attributes';

export default defineApp({
  // Config is passed in (typed + validated at startup). No config files required.
  config: defineConfig({
    database: {
      connection: { client: 'sqlite', connection: { filename: '.tmp/data.db' } },
    },
  }),

  contentTypes: [
    {
      // Explicit naming — no auto-pluralization. Both are required.
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: {
        title: is.string({ required: true }),
        content: is.text(),
      },
      // api defaults to `true` -> REST CRUD auto-generated at /api/articles.
      // Set `api: false` to opt out and only expose custom routes.
    },
  ],

  routes: ({ get, post }) => [post('/echo', (ctx) => ({ youSent: ctx.request.body }))],

  bootstrap({ strapi }) {
    strapi.log.info('Hello from the bootstrap function!');
  },
});
```

Running it (see [Lifecycle & entry points](#lifecycle--entry-points)):

```ts
import { startStrapi } from '@strapi/strapi';
import app from './app';

await startStrapi(app); // headless API server (no admin in Phase 1)
```

## Non-negotiable constraints

1. **Zero breaking changes.** Everything here is additive. Existing file-based apps
   (`src/api/**`, `config/**`, `src/index.ts` lifecycles) keep working byte-for-byte.
   No existing public type, export, or runtime behavior changes.
2. **The two modes are mutually exclusive and explicit** (see below).

## The two modes

This is the central design decision and it differs from a naive "merge files +
in-memory" approach.

### Legacy mode — unchanged

If no programmatic `app` is provided, Strapi behaves **exactly as it does today**:
disk loaders read `src/api/**`, `config/**`, `src/index.ts`, etc. This code path is
not modified. It is the guarantee behind constraint #1.

### Programmatic mode — per-resource sources

If an `app` (a `defineApp(...)` result) is provided, **the programmatic definition is
the source of truth**, and each app-content resource is resolved **independently**
from one of two sources:

- an **in-code** value (array / object / function), or
- a **disk source** via a helper (working name `fromDisk(path)`), which runs the
  existing loader for that resource against an explicit path.

Resources you omit contribute nothing — there is **no implicit disk loading**.

```ts
import { defineApp, fromDisk } from '@strapi/strapi';

defineApp({
  config: fromDisk('./config'), // legacy config dir, from disk
  contentTypes: [
    /* in code */
  ],
  routes: ({ get, post }) => [
    /* in code */
  ],
  controllers: fromDisk('./src/controllers'), // from disk
  policies: fromDisk('./src/policies'), // from disk
});
```

An optional top-level escape hatch (`from: fromDisk('./my-app')`) can fill _all_
unspecified resources from one project root, with per-field sources taking
precedence — handy for "migrate the whole app, override a couple things in code".
On a UID/name collision between a disk source and an in-code definition, we **throw a
clear startup error** rather than silently merging.

> In short: programmatic mode lets you compose each resource from code or disk,
> per-field. Files become an explicit, granular input — not an implicit default.

### Plugins: imported and added, never scanned

In **legacy mode**, plugin loading is unchanged: `getEnabledPlugins` resolves internal
plugins from `@strapi/strapi`, installed plugins by scanning `package.json`
dependencies, and declared plugins from `config/plugins.js`.

In **programmatic mode** we make this right: there is **no `package.json` scan and no
`INTERNAL_PLUGINS` special-casing**. Plugins are treated like any other library — you
`import` the plugin value and add it to the `plugins` map. Nothing loads unless
declared.

```ts
import { defineApp } from '@strapi/strapi';
import usersPermissions from '@strapi/plugin-users-permissions';
import upload from '@strapi/plugin-upload';
import i18n from '@strapi/plugin-i18n';

defineApp({
  plugins: {
    'users-permissions': usersPermissions, // enabled
    upload: { plugin: upload, config: { provider: 'local' } }, // enable + configure
    i18n: { plugin: i18n, enabled: false }, // present but off
  },
});
```

- A plugin entry is `PluginModule | { plugin: PluginModule; enabled?: boolean; config?: object }`.
  The plugin module is the existing `strapi-server` contract — no plugin-package
  changes required for Phase 1.
- **Prefer value imports over side-effect imports.** A bare `import '@strapi/...'` that
  self-registers via global mutation is order-dependent and invisible; it fights the
  declarative model. Import the value, add it explicitly.
- **The map key is the canonical plugin name** (`'users-permissions'`). Plugins
  reference their own UIDs internally as `plugin::<name>.*`, and today that name lives
  in the package's `package.json` (`strapi.name`), not in the `strapi-server` export.
  Keying by canonical name guarantees the internal UIDs line up with zero package
  changes. (Phase 2/3 polish: a `definePlugin({ name, ... })` named export lets plugins
  self-declare their name and unlocks an array form `plugins: [usersPermissions()]`.)
- **Convenience without magic:** a preset (`recommendedPlugins()` from
  `@strapi/strapi/plugins`) returns the familiar set — but it is _just imports_ under
  the hood, so `plugins: { ...recommendedPlugins(), 'my-plugin': myPlugin }` stays
  explicit and tree-shakeable.
- **`plugins: fromDisk()`** is the sole bridge back to legacy behavior (scan
  `package.json` deps, load `config/plugins.js`, apply `src/extensions`). Plugin
  **config** and **extensions** are otherwise taken from the in-memory definition.

So "disk off by default" applies to the **app-content** loaders (`apis`, `components`,
`policies`, `middlewares`, `src-index`, `sanitizers`, `validators`) **and** to plugins:
in programmatic mode nothing is read from disk or `package.json` unless explicitly
requested.

## Why this is low-risk: the pipeline already supports it

Confirmed in `@strapi/core` — this is mostly _feeding the existing pipeline_, not
rewriting it:

1. **File loaders no-op when directories are missing.** Every loader begins with an
   `existsSync`/`pathExists` guard, so the engine already tolerates "no files."
2. **APIs are registered through a single choke point.** File-based APIs end up as
   `strapi.get('apis').add(apiName, api)` where `api` is a plain object
   (`{ contentTypes, routes, controllers, services, policies, middlewares }`). If we
   build that same object in memory, everything downstream — DB schema sync, the
   Document Service, routing, RBAC — behaves identically.
3. **Route handlers can already be inline functions.** `getAction` in
   `services/server/compose-endpoint.ts` accepts `typeof handler === 'function'`, so
   a route DSL that emits inline handlers needs no routing changes. `returnBodyMiddleware`
   sets `ctx.body` from a handler's return value when `ctx.body` is nil, so
   `post('/echo', (ctx) => ({ ... }))` works as shown — and a handler that sets
   `ctx.body` itself also works. _Implementation note:_ `registerAPIRoutes` forces
   `type: 'content-api'` on every api router, so inline routes are served under the `/api`
   prefix (i.e. `POST /api/echo`) and default to `config.auth: false` (public) so they work
   with no permission setup.

## Code-review findings (runtime integration details)

A second pass through `@strapi/core` surfaced integration details that shape the
implementation. These are reflected in the data flow, decisions, and phase plan below.

1. **Config is consumed at _construction_, not at register.** `registerInternalServices()`
   runs in the `Strapi` **constructor** and builds the `config`, `logger`, `server`, and
   (lazy) `db` providers from `internal_config = loadConfiguration(opts)`. `db` reads
   `config.get('database')` on first access (during `bootstrap`). Therefore a single
   `defineApp` object is consumed in **two stages**: its `config` must be merged inside
   `loadConfiguration(opts)` (so `createStrapi` must pass `app.config` down), while
   content types / routes / plugins / lifecycles are consumed later at the register
   phase. (Decision 13.)
2. **"Headless" means no admin _panel_, not no admin _module_.** `admin` is an always-on
   **provider** (not a plugin): it `require`s `@strapi/admin/strapi-server` at init and
   registers `admin::user` and permission content types. Every content type also gets
   `createdBy`/`updatedBy` relations targeting `admin::user` (`addCreatorFields`). So the
   admin **server module is effectively required** for content types to resolve;
   `serveAdminPanel: false` only stops building/serving the panel. `@strapi/admin` remains
   a runtime dependency even for a "pure API". (Decision 14.)
3. **`loadSrcIndex` must brand-check before validating.** It validates the `src/index`
   default export with yup `.noUnknown()` against `{ register, bootstrap, destroy }`; a
   `defineApp` result has extra keys and would be rejected. Brand detection must
   short-circuit _before_ that validation. (Decision 15.)
4. **CLI entry in Phase 1 is `strapi start`, not `develop`.** `strapi develop` is
   admin/bundler-coupled (cluster + vite/webpack admin watch, `--build-admin` default on),
   whereas `strapi start` simply does `createStrapi(...).start()`. Phase 1 supports
   `startStrapi(app)` directly and `strapi start` via brand detection; `develop` parity is
   deferred (it is tied to admin watch). (Decision 16.)
5. **TS execution is the caller's responsibility in programmatic mode.** `compileStrapi`
   is a CLI concern. A `.ts` entry running `startStrapi(app)` is executed via the user's
   own toolchain (tsx / ts-node / precompiled). We do not ship a TS runtime. (Decision 17.)
6. **Components in Phase 1 come only from `fromDisk`.** A content type may reference a
   component, but there is no programmatic `defineComponent` until Phase 3, so in-code
   component attributes require the component itself to be loaded via `fromDisk`.
   (Decision 18.)
7. **Route verb set uses `del`, not `delete`.** `delete` is a reserved word and cannot be
   a destructured binding, so the DSL exposes `get, post, put, patch, del`. (Decision 19.)

## Loader-level surface (research)

Before rewriting any core loader, we confirmed what plugins and user code can actually
reach at this level, so the rewrite stays behind a stable contract.

**Everything external goes through the DI container and instance accessors — never the
loaders.** The loaders are private: `loadApplicationContext` has a single internal
caller (`providers/registries.ts`), and no plugin, test, or CLI imports the individual
loaders. They are therefore safe to rewrite.

The contract that must remain stable:

- **Registries** (mutated at register/bootstrap by plugins & user code):
  `models`, `sanitizers`, `validators`, `custom-fields`, `content-types`, `services`,
  `policies`, `middlewares`, `hooks`, `controllers`, `plugins`, `apis`. In-tree
  examples: `strapi.get('models').add(...)` (i18n), `strapi.sanitizers.add(...)`
  (users-permissions), `strapi.customFields.register(...)`.
- **Instance accessors**: `documents`, `db`, `contentType(uid)`, `contentTypes`,
  `service`, `config`, `dirs`, `fs`, `log`, `store`, `plugin(name)`, `eventHub`,
  `reload`, … plus `global.strapi`.
- **`strapi.dirs`** is documented public API, read by CTB, upload, admin, the
  public/favicon middlewares and data-transfer. It must always be populated — it is
  (`getDirs` defaults to cwd), so programmatic apps keep it valid even with no files.
- **Lifecycle contracts**: plugin `strapi-server`
  (`{ register, bootstrap, destroy, config, routes, controllers, services, policies, middlewares, contentTypes }`)
  and user `src/index.ts` (`{ register, bootstrap, destroy }`).

**Refactor approach.** Each app-content loader is split into a path-parametric core
(`loadXFromDir(strapi, dir)`) plus a thin legacy wrapper that calls the core with the
existing `strapi.dirs.dist.*` path. Legacy behavior is byte-identical (it is literally
the same code, just parameterized); programmatic `fromDisk(path)` calls the same core
with a user-supplied path.

## Architecture

New, self-contained module: `packages/core/core/src/app-definition/`. Internals live
in `@strapi/core`; the public surface is exposed via `@strapi/strapi`.

```
app-definition/
  index.ts        # public surface: defineApp, defineConfig, fromDisk, isAppDefinition, types
  brand.ts        # Symbol brands to detect defineApp()/defineConfig()/fromDisk() results
  types.ts        # AppDefinition, AppContentType, route-DSL + config + source types
  attributes.ts   # attribute builder namespace (string/text/integer/…)
  routes.ts       # route DSL factory (get/post/put/del/patch)
  config.ts       # defineConfig + per-domain config factories & validation
  sources.ts      # fromDisk(path): branded per-resource disk source
  normalize.ts    # AppDefinition -> { apiName, api } entries (strict, explicit)
  load.ts         # programmatic loaders; resolves each resource from code or disk
```

The existing app-content loaders are refactored in place into path-parametric cores
(`loadXFromDir(strapi, dir)`) so both the legacy wrappers and the programmatic
`fromDisk(...)` resolver share one implementation per resource.

Public packaging:

- `@strapi/strapi` re-exports `defineApp`, `defineConfig`, `isAppDefinition`,
  `createStrapi`, `startStrapi`, and types.
- `@strapi/strapi/attributes` — new subpath export for the `is.*` builders.

### Data flow (programmatic mode)

```
createStrapi({ app })                         src/index.ts default export
        │                                              │
        │                                              │ loadSrcIndex: isAppDefinition?
        │                                              │   yes -> treat as { app }
        │                                              │   no  -> existing yup validation
        └──────────────────────┬───────────────────────┘
                               ▼
        STAGE 1 — construction (Strapi constructor)
        loadConfiguration(opts) merges app.config  ─►  config / logger / server / db(lazy)
                               │
                               ▼
        STAGE 2 — register phase (loadApplicationContext)
                               │
                     ┌─────────┴───────────┐
              programmatic?            legacy?  ── existing code path (UNCHANGED)
                     │
                     ▼
             runProgrammaticLoaders(strapi)
               │ per resource: in-code value OR fromDisk(path) -> loadXFromDir core
               │ plugins: import-and-add (no scan) | fromDisk() bridge
               ▼
         normalize CTs / routes / controllers / services / policies / middlewares
         -> registries (apis.add, etc.)
                     │
                     ▼ (existing pipeline, unchanged)
         db.schema.sync · documents · initRouting · RBAC
```

The `admin` provider (always on) loads `@strapi/admin/strapi-server` and registers
`admin::user`, which content-type creator relations depend on. Lifecycles
(`register`/`bootstrap`/`destroy`) from the definition are composed into `strapi.app`
so the existing `runUserLifecycles` runs them.

### Strict, explicit content types (no legacy magic)

The programmatic path uses its **own stricter validator** (separate from the
file-based one, which is untouched):

- `singularName` **and** `pluralName` are both **required** — no auto-pluralization.
  Missing either throws at startup.
- `collectionName`/`globalId` are explicit, with defaults applied only where
  unambiguous.
- `uid` is still constructed (`api::<apiName>.<name>`) because it is structural and
  referenced everywhere (Document Service, relation targets). `apiName` defaults to
  `singularName` and can be overridden to group several content types under one API
  namespace.

### Auto-generated REST API (default on)

For each programmatic content type with `api !== false`, we auto-generate a core
router + controller + service via the existing
`factories.createCoreRouter/Controller/Service`, giving CRUD at `/api/<pluralName>`
out of the box — matching legacy behavior. `api: false` opts out.

### Config factories

Config can come from disk (legacy, or `config: fromDisk('./config')`) **or** be passed
in as an object. `defineConfig` (plus per-domain factories such as
`defineDatabaseConfig` / `defineServerConfig`) is **fully typed** and **validated at
startup**, throwing a clear error on malformed config. Because a no-files app cannot
boot without at least database config, this is required for the Phase 1 MVP rather than
optional.

Because of finding #1 (config is read in the constructor), `app.config` is the one part
of the definition that `createStrapi` forwards into `loadConfiguration(opts)` before the
register phase; everything else is consumed at register. Phase 1 validators focus on the
fields a no-files app actually needs (`database`, `server`), passing the rest through to
the existing config defaults so behavior does not drift from legacy.

### Lifecycle & entry points

The `Strapi` instance already exposes granular lifecycle methods
(`register()` = init, `bootstrap()`, `load()`, `start()`, `destroy()`). We add
ergonomic top-level helpers and keep the granular ones available:

```ts
// one-liner
await startStrapi(app);

// granular control
const strapi = createStrapi({ app });
await strapi.register(); // init only
await strapi.bootstrap(); // set up data model / jobs
await strapi.start(); // listen
```

`startStrapi(app)` is the primary Phase 1 entry. `strapi start` also works once
`loadSrcIndex` brand-detects a `defineApp` default export. `strapi develop` parity is
deferred (Phase 2/3) because it is coupled to the admin bundler/watch pipeline. In
programmatic mode the caller is responsible for executing TypeScript (tsx / ts-node /
precompiled); `compileStrapi` remains a CLI-only concern.

## Phase plan

### Phase 1 — Headless MVP (no admin **panel**)

> "Headless" = the admin server module still loads (it is an always-on provider that
> content-type creator relations depend on); only the admin **panel** is not built or
> served (`serveAdminPanel: false`).

- [x] Explore + confirm integration points.
- [x] Agree the design (this RFC).
- [ ] `defineApp()` + `defineConfig()` + `fromDisk()` + brands + types.
- [ ] Attribute builder namespace (`@strapi/strapi/attributes`).
- [ ] Route DSL with inline handlers.
- [ ] Strict normalizer: content types → `apis` registry (+ default auto CRUD).
- [ ] Refactor app-content loaders into path-parametric cores (legacy wrappers unchanged).
- [ ] Programmatic branch in `loadApplicationContext` (legacy branch untouched).
- [ ] Per-resource `fromDisk(path)` sources; collision → startup error.
- [ ] Programmatic `plugins` map (import-and-add); no `package.json` scan; `fromDisk()` bridge.
- [ ] `recommendedPlugins()` preset (`@strapi/strapi/plugins`) — imports only, no magic.
- [ ] `StrapiOptions.app`; two-stage wiring (`app.config` → `loadConfiguration`; rest → register).
- [ ] `startStrapi` + keep granular `register`/`bootstrap`/`start`; `strapi start` brand path.
- [ ] `loadSrcIndex` brand-checks **before** yup validation; routes `defineApp` exports.
- [ ] Route DSL verbs `get/post/put/patch/del`; inline handler return → `ctx.body`.
- [x] Confirm zero-plugin boot; `@strapi/admin` server module always loads. _(Resolved: not
      possible — admin requires `plugin::email.rateLimit`; `email` is the minimum, `i18n` for
      auto-CRUD. See Open questions.)_
- [ ] Example app under `examples/` (headless).

### Phase 2 — Admin ✅ (implemented)

- [x] Async `buildAdmin({ app, dir })` façade over the node build pipeline — accepts the
      `defineApp(...)` definition directly (no file scan). Exposed from `@strapi/strapi`
      via a lazy dynamic import.
- [x] No-files admin build: `createBuildContext` reworked to accept object input. The
      frontend plugin set is derived from the in-memory `app.plugins` map (each entry's
      optional `resolve` hint → `<base>/strapi-admin`), **never** a `package.json` scan.
- [x] Admin served when a build exists: `startStrapi` auto-detects `<distDir>/build` and
      flips `serveAdminPanel` (explicit option still wins); headless otherwise.
- [x] CTB **read-only** for programmatic content types, **writable** only for file-backed
      ones — tagged by origin (`pluginOptions['content-type-builder'].origin =
'programmatic'`). `formatContentType` exposes `editable`; the update/delete
      controllers reject programmatic CTs.
- [x] End-to-end proof: `examples/programmatic-server` builds the panel from the
      programmatic definition and a Playwright smoke test asserts it renders in a real
      browser.
- `strapi develop` parity (live admin watch for programmatic apps) is deferred to Phase 3
  — it is coupled to the cluster + bundler watch and disk file watching.

### Phase 3 — Ecosystem & DX

- [x] `defineComponent` — in-code components (`components: [defineComponent({...})]`),
      normalized into the `components` registry alongside the existing `fromDisk` path.
      Identity is an explicit `uid` (`<category>.<name>`, both kebab-case); no
      filename-derived names. Supersedes the Phase 1 "components are disk-only" limit
      (decision 18). Exposed from `@strapi/strapi`.
- [x] `definePlugin({ name })` + array plugin form — `definePlugin` carries the canonical
      name **on the value** (`{ name, plugin, enabled?, config?, resolve? }`), unlocking the
      array form `plugins: [definePlugin({ name: 'users-permissions', plugin: usersPermissions })]`
      next to the existing name-keyed map. Both forms normalize to the same name-keyed map
      internally (`normalizePluginsInput`), so the runtime UIDs (`plugin::<name>.*`) and the
      admin `resolve` hint line up with **zero plugin-package changes** (decision 12). Exposed
      from `@strapi/strapi`.
- [x] End-to-end type inference from `defineApp` into `strapi.documents(...)`. `defineApp`
      is a `<const TInput>` generic returning `BrandedApp<TInput>` (`AppDefinition & TInput`),
      so a definition's literal `singularName`/`uid`/attribute types are preserved (array
      fields relaxed to `readonly` so `const` inference doesn't widen; the `[APP_DEFINITION]`
      brand stays present). `infer.ts` maps that into the registry shapes Strapi already keys
      on — `RegisterContentTypes<typeof app>` / `RegisterComponents<typeof app>` build
      `{ [uid]: schema }` maps assignable to `Public.ContentTypeSchemas` /
      `Public.ComponentSchemas` — which a user merges via `declare module '@strapi/strapi'`
      (the same declaration-merging hook the file-based codegen uses), making
      `strapi.documents(uid)` UID-constrained and attribute-aware with no runtime change.
      `fromDisk(...)` sources infer `never`. Exposed from `@strapi/strapi`.
- Hot-reload parity for programmatic apps in `strapi develop`.
- Codemod: scaffolded app → single-file `defineApp`.
- Recipes for embedding Strapi inside existing Koa/Express/Next servers.

## Resolved decisions (from design discussion)

| #   | Decision                                                                                                                                                                                                                                                 |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Phasing: Phase 1 headless (no admin), Phase 2 admin, Phase 3 extras.                                                                                                                                                                                     |
| 2   | Modes are exclusive: legacy = files only (unchanged); programmatic = source of truth with per-resource `fromDisk(path)` opt-in. Nothing (incl. plugins/`package.json`) is read implicitly.                                                               |
| 3   | Programmatic path drops legacy magic; explicit `singularName`/`pluralName` required.                                                                                                                                                                     |
| 4   | Auto-CRUD default-on, `api: false` to opt out.                                                                                                                                                                                                           |
| 5   | Fully typed/discoverable surface; otherwise keep legacy runtime defaults (no telemetry/logging drift).                                                                                                                                                   |
| 6   | Config supported from files **or** passed in via typed, startup-validated factories.                                                                                                                                                                     |
| 7   | Internals in `@strapi/core`, exposed via `@strapi/strapi` (+ `/attributes`).                                                                                                                                                                             |
| 8   | `defineApp` name kept; add `startStrapi` + keep granular `register`/`bootstrap`/`start`.                                                                                                                                                                 |
| 9   | Use one unified source helper: `fromDisk(path)`. Each field decides whether the path represents a file, directory, or project root.                                                                                                                      |
| 10  | Include the top-level fallback in Phase 1: `from: fromDisk('./app')` fills unspecified resources from one legacy project root.                                                                                                                           |
| 11  | Guard the `package.json` assumption for no-files apps and synthesize minimal app info when absent.                                                                                                                                                       |
| 12  | Programmatic plugins are **imported and added** to a `plugins` map keyed by canonical name; no `package.json` scan, no `INTERNAL_PLUGINS` auto-load. `fromDisk()` is the only bridge to legacy discovery. `recommendedPlugins()` preset is imports-only. |
| 13  | `defineApp` is consumed in **two stages**: `config` is merged in `loadConfiguration` (constructor); content/routes/plugins/lifecycles at the register phase. `createStrapi` forwards `app.config`.                                                       |
| 14  | "Headless" = no admin **panel** (`serveAdminPanel: false`); the `@strapi/admin` server module still loads (always-on provider; creator relations target `admin::user`).                                                                                  |
| 15  | `loadSrcIndex` brand-checks **before** yup `.noUnknown()` validation, then routes `defineApp` exports to the programmatic path.                                                                                                                          |
| 16  | Phase 1 CLI entry is `startStrapi()` + `strapi start` (brand detection). `strapi develop` parity deferred (admin-coupled).                                                                                                                               |
| 17  | Programmatic mode does not ship a TS runtime; the caller executes `.ts` via their own toolchain.                                                                                                                                                         |
| 18  | Phase 1 components are available only via `fromDisk`; programmatic `defineComponent` is Phase 3.                                                                                                                                                         |
| 19  | Route DSL verbs are `get/post/put/patch/del` (`delete` is reserved). Handler return value becomes `ctx.body` when unset.                                                                                                                                 |
| 20  | Programmatic content types default `apiName` to `singularName` (own API namespace, uid `api::<singular>.<singular>`); `apiName` is overridable to group content types.                                                                                   |
| 21  | Top-level `from` precedence: a per-field source replaces that whole resource from `from`; a collision **within** one resource (disk + in-code, same UID/name) throws.                                                                                    |

## Open questions

- **CTB editability mechanism** — _resolved in Phase 2_: CTB writes `schema.json` to a
  path derived from `strapi.dirs.app.api/<apiName>/content-types/<singularName>/`. A
  programmatic content type has no such file, so the normalizer stamps
  `pluginOptions['content-type-builder'].origin = 'programmatic'` (the same plugin-options
  bag that already holds `visible`). The CTB reuses it via `isContentTypeEditable` to
  expose `editable: false` to the admin and to reject `updateContentType`/`deleteContentType`
  server-side (`contentType.programmatic.readonly`). No new schema field or UID→path logic
  was invented.
- **Hard-required internal plugins** — _resolved during implementation_: a **true
  zero-plugin boot is not possible**. The always-on admin server registers
  `/forgot-password`, whose route config references the `plugin::email.rateLimit`
  middleware, so **`email` is the hard minimum**. **`i18n`** is additionally required
  whenever a content type uses auto-CRUD (`api: true`), because REST route generation calls
  `strapi.plugin('i18n').service('content-types')`. DB / document service / content-API /
  RBAC themselves need no plugin. `recommendedPlugins()` bundles the familiar set (incl.
  `email` + `i18n`); a minimal `{ email }` + `api: false` app boots. Verified by
  `examples/single-file/integration.test.cjs`. These are imported and added explicitly —
  never scanned.
- **ESM vs CommonJS runtime** — _new finding_: programmatic apps run under **CommonJS** in
  Phase 1. The published `.mjs` bundles use bare directory imports (e.g. `lodash/fp`) that
  Node's strict ESM resolver rejects, so a `node app.mjs`-style ESM entry fails on the first
  `@strapi/*` import. The TS authoring snippets above remain the target shape; ESM-native
  execution is deferred to a packaging pass (dual-build fix), tracked for a later phase.
- **Lazy plugin resolution** — _new finding_: `recommendedPlugins()` resolves each plugin's
  `strapi-server` export **lazily** (thunks via `createRequire`) because some first-party
  plugins (e.g. `content-manager`) run `global.strapi`-dependent code at module evaluation
  and must not be imported before the register phase.
