# Implementation Checklist — Phase 1 (Headless MVP)

Ordered, dependency-aware task list derived from the RFC + C4 + ADRs. Each task notes its
target location and the ADR(s) it implements. Boxes are unchecked — **implementation has
not started**.

Legend: `→` depends on. Locations are under `packages/core/` unless noted.

## Milestone A — Foundations (types, brands, builders)

No runtime wiring yet; pure, independently testable units.

- [x] **A1. Module scaffold** — create `core/src/app-definition/` with `index.ts`,
      `brand.ts`, `types.ts`, `sources.ts`. _(ADR-0001, ADR-0005)_
- [x] **A2. Brands + guards** — `APP_DEFINITION`/`DISK_SOURCE` symbols, `isAppDefinition`,
      `isDiskSource`. _(ADR-0001)_
- [x] **A3. `fromDisk(path)`** branded source factory. → A2 _(ADR-0010)_
- [x] **A4. Attribute builders** — `attributes.ts` (`string/text/integer/boolean/datetime/
enumeration/relation/component/media/json/uid/...`), typed from `@strapi/types`.
      _(ADR-0004)_
- [x] **A5. Route DSL** — `routes.ts` exposing `get/post/put/patch/del` → `Core.RouteInput`
      with inline handlers. _(ADR-0012)_
- [x] **A6. Config factories** — `config.ts`: `defineConfig`, `defineDatabaseConfig`,
      `defineServerConfig`; startup validation (database/server). _(ADR-0008)_
- [x] **A7. `defineApp()`** — validate shape, attach brand, return typed. → A2,A4,A5,A6
      _(ADR-0001)_ — in `define-app.ts`.
- [x] **A8. Unit tests** for A2–A7 (brands, builder outputs, DSL shape, config validation).
      _(60 tests passing; `yarn build` green.)_

## Milestone B — Loader refactor (equivalence-preserving)

Behind the stable registry/accessor contract; legacy behavior must stay byte-identical.

- [x] **B1. Extract path-parametric cores** — `loadXFromDir(strapi, dir)` for apis
      (`loadAPIsFromDir`), components (`loadComponentsFromDir`), policies
      (`loadPoliciesFromDir`), middlewares (`loadLocalMiddlewaresFromDir`), src-index
      (`loadSrcIndexFromDir`). _(ADR-0002)_ Sanitizers/validators have no directory input
      (they set fixed content-api defaults) so they were left as-is.
- [x] **B2. Legacy wrappers** call cores with existing `strapi.dirs.dist.*`. → B1 _(ADR-0002)_
- [x] **B3. Equivalence tests** — `loaders/__tests__/loaders-from-dir.test.ts` proves each
      core works against an arbitrary dir and that the legacy wrapper delegates with the dist
      path (byte-identical, one-line delegation). Full `yarn test:unit` stays green. → B2
      _(ADR-0002)_
- [x] **B4. `loadApplicationContext` branch point** — legacy vs programmatic via
      `getAppDefinition(strapi)`; legacy branch unchanged. → B2 _(ADR-0001)_

## Milestone C — Normalizer + programmatic loader

- [x] **C1. Strict CT normalizer** — `normalize.ts` requires `singularName`+`pluralName`
      (kebab-case), builds `uid = api::<apiName>.<singular>` (`apiName` default `singularName`),
      and assembles the `api` registry object (mirrors loader: `apiName`/`collectionName`/
      `globalId`). → A7 _(ADR-0004, ADR-0011)_
- [x] **C2. Auto-CRUD** — `buildApiModules` generates router/controller/service via
      `factories.createCore*` for `api !== false`. → C1 _(ADR-0003)_
- [x] **C3. Route normalization** — `resolveRoutes` runs the DSL; inline handlers are
      attached as a content-api router on the synthetic `application` API. → A5 _(ADR-0012)_
- [x] **C4. `runProgrammaticLoaders`** — `load.ts` resolves each resource (in-code vs
      `fromDisk` → `loadXFromDir`), applies the top-level `from` fallback + per-field
      precedence; collisions surface as the registries' "already registered" errors. →
      B1,C1,C3 _(ADR-0010)_
- [x] **C5. Lifecycle composition** — in-code `register/bootstrap/destroy` are composed into
      `strapi.app` for `runUserLifecycles` (falls back to `<from>/src/index.js`). → B4
      _(ADR-0001)_

## Milestone D — Plugins (import-and-add)

- [x] **D1. `normalizePluginModule`** — call-if-function/else-object + defaults; shared by
      both paths. _(ADR-0006)_ In `app-definition/plugins.ts` (`normalizePluginModule`,
      `unwrapPluginEntry`).
- [x] **D2. Programmatic `plugins` map** — `loadProgrammaticPlugins` registers entries keyed
      by canonical name; `enabled`/`config` (default+validator) handling; **no** `package.json`
      scan. → D1 _(ADR-0006)_
- [x] **D3. `plugins: fromDisk()` bridge** — `loadPluginsResource` calls the legacy
      `loadPlugins(strapi)` discovery when `plugins` is a disk source. → D2 _(ADR-0006)_
- [x] **D4. `recommendedPlugins()` preset** — `@strapi/strapi/plugins`, imports-only (the 7
      former `INTERNAL_PLUGINS`, keyed by canonical name). → D2 _(ADR-0006)_
- [x] **D5. Zero-plugin boot check** — **Finding:** a _true_ zero-plugin boot is impossible.
      The always-on admin server registers `/forgot-password`, which references the
      `plugin::email.rateLimit` middleware, so **`email` is the hard minimum**; **`i18n`** is
      additionally required for auto-CRUD (`api: true`) route generation. Verified by
      `examples/single-file/integration.test.cjs` (minimal `{ email }` + `api: false` boots).
      Documented in the RFC open questions. _(ADR-0007, RFC open question)_

## Milestone E — Wiring & entry points

- [x] **E1. `StrapiOptions.app`** on the `Strapi` class; constructor calls
      `setAppDefinition(this, opts.app)`. _(ADR-0001)_
- [x] **E2. Two-stage config** — `loadConfiguration(opts)` merges `opts.app?.config`;
      guards missing `package.json` + synthesizes minimal info. → E1 _(ADR-0008, ADR-0013)_
- [x] **E3. `createStrapi({ app })`** threads `app` through options. → E1,E2 _(ADR-0001)_
- [x] **E4. `startStrapi(app, opts?)`** façade (headless default `serveAdminPanel:false`).
      → E3 _(ADR-0007, ADR-0009)_
- [x] **E5. `loadSrcIndex` brand-check** — `loadApplicationContext` branches on
      `getAppDefinition` (constructor) or a branded `src/index.js` safety net. → A2 _(ADR-0001)_
- [x] **E6. `strapi start` brand path** — `detectAppDefinition` reads the built
      `src/index.js` default export and threads it into `createStrapi`. → E5 _(ADR-0009)_

## Milestone F — Packaging & exports

- [x] **F1. `@strapi/strapi` root re-exports** — `defineApp/defineConfig/
defineDatabaseConfig/defineServerConfig/fromDisk/startStrapi/createStrapi/isAppDefinition/
isDiskSource` + types (via `@strapi/core`). → E4 _(ADR-0005)_
- [x] **F2. Subpath exports** — `./attributes` and `./plugins` in `package.json` +
      rollup inputs (both `@strapi/core` and the `@strapi/strapi` façade). → A4,D4 _(ADR-0005)_
- [x] **F3. Type exports** — `AppDefinition`/`AppInput`/`AppContentType`/`AppConfig`/
      `PluginEntry`/`PluginModule`/`RouteBuilder`/`DiskSource` ship in `.d.ts` (verified built).

## Milestone G — Example & verification

- [x] **G1. `examples/single-file`** — headless app (`defineApp` + `is.*` + custom route +
      `bootstrap` + `recommendedPlugins`), runnable via `startStrapi` (`yarn start`). Authored in
      CommonJS (`index.cjs`/`start.cjs`) — see the ESM runtime note below; the TS authoring shape
      is in the example README. Verified: boots and `POST /api/echo` returns the body. _(all)_
- [x] **G2. Integration test** — `integration.test.cjs` boots programmatically (in-process,
      forked per test), asserts the public custom `/api/echo` route, auth-gated auto-CRUD (`401`),
      document-service create/find, and DB schema sync. → C2,C3,E4
- [x] **G3. `fromDisk` test** — integration test boots a `fromDisk(...)` content type and
      asserts the model + synced schema; loader-level precedence + collision are covered by
      `app-definition/__tests__/load.test.ts`. → C4
- [~] **G4. Gates** — `yarn test:unit` (4058 pass, 0 fail), `yarn lint`/`yarn prettier`
  (changed files clean), legacy equivalence (B3) green. `yarn test:ts:back` running; admin
  panel build (`yarn test:e2e`) is Phase 2.

## Cross-cutting / Definition of Done (Phase 1)

- [x] Legacy apps unchanged (B3 + full unit suite: 4058 pass, 0 fail). _(ADR-0002)_
- [x] No new `any` where a `@strapi/types` type exists; types exported.
- [x] Public surface documented (`defineApp`, `defineConfig`, `fromDisk`, `startStrapi`,
      `is.*`, `recommendedPlugins`) — RFC + example README.
- [x] RFC + ADRs updated for decisions changed during implementation (see Findings below).

## Findings during implementation (log)

1. **No true zero-plugin boot (D5).** The always-on admin server registers
   `/forgot-password`, which references `plugin::email.rateLimit`, so **`email` is the hard
   minimum**. **`i18n`** is additionally required for auto-CRUD (`api: true`) route generation
   (`getConditionalQueryParams` reads `strapi.plugin('i18n')`). `recommendedPlugins()` bundles
   both. _(ADR-0007)_
2. **Inline custom routes are content-api routes (under `/api`), default public.**
   `registerAPIRoutes` forces `type: 'content-api'` on every api router; there is no
   registry-driven path to a root, no-prefix router. So `post('/echo', …)` is served at
   `/api/echo`. Inline routes default to `config.auth: false` (public) so they work with no
   permission setup; an explicit per-route `config.auth` wins. Reversible. _(ADR-0012)_
3. **Programmatic apps run under CommonJS (Phase 1).** The published `.mjs` bundles use bare
   directory imports (e.g. `lodash/fp`) that Node's strict ESM resolver rejects, so
   ESM-native execution is deferred to a later packaging pass. `recommendedPlugins()` resolves
   each plugin's `strapi-server` export **lazily** (via `createRequire`) because some plugins
   (e.g. `content-manager`) run `global.strapi`-dependent code at module evaluation and must
   not be imported before the register phase. _(ADR-0006)_
4. **Headless apps still need admin secrets.** Because admin always loads (ADR-0007), a
   programmatic app must supply `admin.apiToken.salt`, `admin.auth.secret`,
   `admin.transfer.token.salt` (read from env in real apps).

## Deferred (tracked, not Phase 1)

- **Phase 2:** `buildAdmin({ app, dir })`; serve panel; CTB read-only for programmatic
  content types (origin tag); `strapi develop` parity; no-files admin build (rework
  builder to accept object input).
- **Phase 3:** `defineComponent`, `definePlugin({ name })` + array plugin form;
  end-to-end type inference into `strapi.documents`; codemod; embedding recipes.
