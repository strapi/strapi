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

## Phase 2 — Admin

Build and serve the admin **panel** for a programmatic (no-files) app. Boxes are
checked only after `yarn build` + the relevant tests pass.

- [x] **P1. `resolve` hint on plugin entries** — `PluginEntry` object form gains an
      optional `resolve` (npm package base) consumed **only** by the admin build;
      `recommendedPlugins()` now returns `{ plugin, resolve: '@strapi/<name>' }` per
      entry. `unwrapPluginEntry` surfaces it; `getAdminPluginResolutions(map)` derives
      the enabled `{ name, resolve }` set. Runtime behavior unchanged.
      _(app-definition/`plugins.ts`, `strapi/src/plugins.ts`)_
- [x] **P2. Programmatic frontend-plugin derivation** — `getProgrammaticPlugins({ app, cwd })`
      maps each enabled plugin to the package whose `strapi-admin` export resolves
      (via `resolve` hint, then `@strapi/<name>`, then `<name>`); server-only plugins
      (no `strapi-admin`) are skipped, exactly like `getMapOfPluginsWithAdmin` does for
      file-based apps. A `plugins: fromDisk()` source returns `null` → legacy discovery.
      **No `package.json` scan** (ADR-0006). _(`node/core/programmatic-plugins.ts`)_
- [x] **P3. `createBuildContext` accepts object input** — new `app?` arg. When present
      the Strapi instance is created from the definition and the plugin set comes from
      P2 instead of `getEnabledPlugins`. Legacy (file-based) path untouched.
      _(`node/create-build-context.ts`)_
- [x] **P4. `buildAdmin({ app, dir })` façade** — async façade over the node build
      pipeline (writeStaticClientFiles + vite/webpack) that takes a `defineApp(...)`
      definition directly; skips the `strapi build` TS-compile + admin-dependency steps
      (caller's responsibility, ADR-0009/0017). Exposed from `@strapi/strapi` via a lazy
      dynamic import so runtime imports stay cheap. _(`node/build-admin.ts`, `strapi/src/index.ts`)_
- [x] **P5. Serve the panel when a build exists** — `startStrapi` auto-detects a build at
      `<distDir>/build/index.html` and sets `serveAdminPanel` accordingly (explicit
      option still wins); headless otherwise. The admin server route already serves
      `<dist>/build`. _(`core/src/index.ts`)_
- [x] **P6. CTB read-only for programmatic content types** — the normalizer stamps
      `pluginOptions['content-type-builder'].origin = 'programmatic'`; CTB exposes
      `getContentTypeOrigin`/`isContentTypeEditable` + an `editable` flag on
      `formatContentType`, and the `updateContentType`/`deleteContentType` controllers
      reject programmatic CTs with `contentType.programmatic.readonly` (they have no
      `schema.json` to write back to). File-based CTs carry no tag and stay editable.
      _(`app-definition/normalize.ts`, `content-type-builder/server/.../content-types.ts`)_
- [x] **P7. Example + browser proof** — `examples/programmatic-server` split into
      `app.ts` (definition) + `index.ts` (`startStrapi`) + `build-admin.ts`
      (`buildAdmin({ app })`). Its Playwright smoke test builds the panel from the
      programmatic definition and asserts it **renders in a real browser** (title,
      `#strapi` mounted, registration form), alongside the existing public/auth-gated
      route assertions. Run with a timeout (`--global-timeout=240000`).
- [x] **P8. Tests** — `getAdminPluginResolutions` + `resolve` unwrap, `getProgrammaticPlugins`
      (mocked resolution), normalizer origin tag, `recommendedPlugins()` resolve hints,
      CTB `editable`/origin + controller read-only gating. Full `yarn test:unit`: 4077
      pass, 0 fail. Example e2e (4 tests incl. admin render) green.
- [ ] **P9. (Stretch) `strapi develop` parity** — deferred; admin/bundler + cluster-watch
      coupled. `buildAdmin` covers the build-once-then-serve path; live admin watch for
      programmatic apps remains Phase 3 (hot-reload parity).

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
5. **Admin build needs a frontend-plugin source, not a `package.json` scan (Phase 2).**
   The file-based build derives the admin's plugin set from `info.dependencies` +
   `config/plugins.js`. Programmatic apps have neither, so the in-memory `app.plugins`
   map is the source of truth: each entry carries an optional `resolve` hint (npm
   package base) that `buildAdmin` maps to `<base>/strapi-admin`. `recommendedPlugins()`
   sets `resolve: '@strapi/<name>'`; absent a hint, `buildAdmin` falls back to the
   `@strapi/<name>` then `<name>` conventions and skips plugins with no `strapi-admin`
   export — matching how `getMapOfPluginsWithAdmin` filters file-based plugins. Verified:
   the example's generated `.strapi/client/app.js` imports all 7 recommended plugins'
   `strapi-admin` entries and the panel renders in a browser. _(ADR-0006, Phase 2)_
6. **`buildAdmin` is exposed from `@strapi/strapi` via a lazy dynamic import.** The node
   build pipeline (vite/webpack/prettier) is heavy; importing it eagerly from the main
   entry would bloat every runtime `import '@strapi/strapi'`. The `buildAdmin` named
   export therefore `await import('./node/build-admin')` on first call, keeping the
   runtime surface cheap while still living at the top-level public API.
7. **CTB editability gates on an origin tag, reusing `pluginOptions['content-type-builder']`.**
   Confirming the Phase 1 open question: CTB edits write `schema.json` to a path resolved
   from `strapi.dirs.app.api/<apiName>/.../schema.json`. Programmatic CTs have no such
   file, so writing would silently scaffold a stray file the loader never reads. The
   normalizer stamps `origin: 'programmatic'` in the existing
   `pluginOptions['content-type-builder']` object (same place as `visible`), and the CTB
   reads it (`isContentTypeEditable`) to (a) expose `editable: false` to the admin and
   (b) reject `updateContentType`/`deleteContentType` server-side. No new schema field or
   UID→path machinery invented. _(Phase 2 open question resolved)_
8. **`strapi develop` parity stays deferred.** `develop` couples the admin bundler/watch
   with a cluster fork + chokidar file watch keyed off disk paths; a programmatic app has
   no files to watch. `buildAdmin` + `startStrapi` cover build-once-then-serve, which is
   the Phase 2 goal. Live programmatic admin watch is folded into the Phase 3 hot-reload
   item. _(ADR-0016)_
9. **Type inference reuses declaration merging, not a new runtime path.** The win is
   purely compile-time, so it rides Strapi's existing global registries
   (`Public.ContentTypeSchemas` / `Public.ComponentSchemas`) rather than inventing a
   parallel system: `RegisterContentTypes<typeof app>` produces the exact `{ [uid]: schema }`
   shape the file-based `strapi ts:generate-types` codegen emits, so a user merges it with
   `declare module '@strapi/strapi' { interface ... }` and gets the same UID-constrained,
   attribute-aware `strapi.documents` the file-based path already has — no document-service
   changes. Two preconditions surfaced: (a) `defineApp` had to become a `<const TInput>`
   generic so literals (`'article'`, attribute brands) don't widen, which forced the
   `AppInput` array fields and `ProgrammaticPlugins` to accept `readonly` arrays; and
   (b) `BrandedApp` had to be `AppDefinition & TInput` (not `TInput & { brand }`) so
   contextual typing can never drop the `[APP_DEFINITION]` brand at a call site. Because
   the benefit is type-only, no `examples/single-file` runtime assertion was added — a
   booted server can't observe types — the coverage lives in compile-time assertions
   (`infer.test.ts`, checked by `yarn test:ts`). `globalId`/`category` are typed as
   `string` placeholders since they're runtime-generated, not declared in code.

## Deferred (tracked, not Phase 1)

- **Phase 2 (done):** `buildAdmin({ app, dir })`; serve panel; CTB read-only for
  programmatic content types (origin tag); no-files admin build (builder reworked to
  accept object input). _(P1–P8 above.)_
- **Phase 3 (in progress):**
  - [x] `defineComponent` — in-code components normalized into the `components` registry
        (`app-definition/define-component.ts` + `normalizeComponent`/`buildComponentMap` in
        `normalize.ts`; `loadComponents` in `load.ts` handles the in-code array alongside the
        existing `fromDisk`/`from` paths). Identity is an explicit `uid` (`<category>.<name>`,
        both kebab-case). Exposed via `@strapi/core` → `@strapi/strapi`. Unit tests:
        `__tests__/define-component.test.ts` + component cases in `load.test.ts`/`define-app.test.ts`.
  - [x] `definePlugin({ name })` + array plugin form (`plugins: [definePlugin({ name, plugin })]`).
        `definePlugin` (`app-definition/define-plugin.ts`, branded `PLUGIN_DEFINITION`) carries
        the canonical name on the value; `normalizePluginsInput` (`plugins.ts`) folds the array
        back into the name-keyed map so `loadProgrammaticPlugins`/`getAdminPluginResolutions`
        (runtime + admin build) are unchanged — UIDs (`plugin::<name>.*`) and the admin `resolve`
        hint still line up with zero plugin-package changes (ADR-0006). The map form keeps
        working. Exposed via `@strapi/core` → `@strapi/strapi`. Unit tests:
        `__tests__/define-plugin.test.ts` + array cases in `plugins.test.ts`/`define-app.test.ts`;
        end-to-end proof (array boots, plugins keyed by name, auto-CRUD) + a `defineComponent`
        component-attribute round-trip in `examples/single-file/integration.test.cjs`.
  - [x] End-to-end type inference into `strapi.documents`. `defineApp` is now a
        `<const TInput>` generic returning `BrandedApp<TInput>` (`AppDefinition & TInput`),
        so the literal `singularName`/`pluralName`/`uid`/attribute types of an in-code
        definition survive instead of widening (array fields in `types.ts`/`plugins.ts`
        relaxed to `readonly` for `const` inference; the brand stays present). `infer.ts`
        turns that definition into the registry shapes Strapi already keys on:
        `RegisterContentTypes<App>` / `RegisterComponents<App>` (plus `ContentTypeUIDs`,
        `ComponentUIDs`, `InferContentTypeSchema`) build `{ [uid]: schema }` maps assignable
        to `Public.ContentTypeSchemas` / `Public.ComponentSchemas`. Users merge them via
        `declare module '@strapi/strapi'` — the same declaration-merging hook the file-based
        codegen uses — making `strapi.documents(uid)` UID-constrained and attribute-aware
        with zero runtime cost. `fromDisk(...)` sources infer `never` (discovered the
        file-based way). Exposed via `@strapi/core` → `@strapi/strapi`. Compile-time
        assertions: `__tests__/infer.test.ts`.
  - [ ] Codemod: scaffolded app → single-file `defineApp`.
  - [ ] Embedding recipes (Koa/Express/Next).
  - [ ] `strapi develop` parity / hot-reload for programmatic apps (P9 — admin-watch coupled).
  - [ ] ESM-native execution (dual-build packaging fix; see open questions).
