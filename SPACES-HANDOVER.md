# Spaces Plugin — Handover & Rebuild Guide

## What is this?

A **virtual multi-tenancy** plugin for Strapi 5 (`@strapi/plugin-spaces`). One deployment, one database, many isolated "Spaces". Architecture mirrors `@strapi/plugin-i18n` — a `space` dimension is injected via document-service middleware into every query on opted-in content types.

Design doc: `spaces-design.html` (at repo root — currently empty due to worktree corruption, see below).

## What happened

The implementation was built in a Claude Code worktree session. When the worktree was cleaned up, ~26 of the ~55 source files became **sparse/empty stubs** — they have file sizes in metadata but zero readable content. The 29 files that survived have full, working code.

## Branch & commit

- **Branch**: `feature/spaces-multitenancy`
- **Parent**: `develop` at `8724ba2`
- **Commit**: `ee2472f` — contains the 29 surviving files

## Git health warning

The repo's 644MB pack file causes SIGBUS (signal 10) for most git commands in sandboxed environments. `git add`, `git write-tree`, `git hash-object`, `git ls-files`, and `git status` work. `git log`, `git diff`, `git commit`, `git checkout`, `git branch` crash. A re-clone or `git repack` from a non-sandboxed terminal should fix this.

---

## What WORKS (29 files committed)

### Server (`packages/plugins/spaces/server/src/`)

| File | Purpose |
|------|---------|
| `index.ts` | Plugin entry — exports register, bootstrap, contentTypes, services, middlewares, controllers, routes |
| `lifecycles.ts` | DB lifecycle subscriber — stamps `space` FK on raw `strapi.db.query().create()` bypasses |
| `document-service/multitenancy.ts` | Core middleware — injects `space` filter on reads, stamps `space` on writes |
| `content-types/space/schema.json` | Space collection type — slug, name, color, status (active/archived) |
| `controllers/space.ts` | `GET /spaces/mine` — lists active spaces for current admin |
| `controllers/move.ts` | `POST /spaces/move` — moves N entries to another space |
| `services/content-types.ts` | `isSpaceScopedContentType()` / `getSpaceScopedContentTypes()` helpers |
| `services/move.ts` | Move logic with i18n locale validation, visibility check, transactional update |
| `services/index.ts` | Service barrel — content-types, move, spaces, visibility |
| `middlewares/index.ts` | Exports resolve-space middleware |
| `i18n-integration.ts` | Full i18n cross-plugin integration (locale visibility per space, default locale per space) |
| `settings-visibility/index.ts` | Reusable "settings visibility binding" pattern (AsyncLocalStorage-based unscoped bypass, read/write wrappers) |
| `utils/index.ts` | Typed `getService()` helper |
| `__tests__/lifecycles.test.ts` | Unit tests for lifecycle subscriber |
| `document-service/__tests__/multitenancy.test.ts` | Unit tests for multitenancy middleware |
| `services/__tests__/content-types.test.ts` | Unit tests for content-types service |

### Admin (`packages/plugins/spaces/admin/src/`)

| File | Purpose |
|------|---------|
| `pluginId.ts` | Plugin ID constant |
| `constants.ts` | RBAC permissions (`plugin::spaces.move-entry`) |
| `services/api.ts` | RTK Query base — `adminApi.enhanceEndpoints({ addTagTypes: ['Space'] })` |
| `services/spaces.ts` | `useGetMineSpacesQuery` + `useMoveToSpaceMutation` endpoints |
| `components/MoveToSpaceActions.tsx` | Header action + bulk action for "Move to space" with dialog picker |
| `components/SpaceVisibility.tsx` | CTB checkbox list for "Visible in spaces" binding |
| `components/SpaceVisibilityField.tsx` | Reusable MultiSelect for per-space visibility (locales settings, etc.) |
| `components/SpaceChipColumn.tsx` | Column renderer showing space chip in content-manager list |
| `translations/en.json` | All English translation strings |
| `utils/prefixPluginTranslations.ts` | Standard translation prefix utility |
| `tsconfig.json` + `tsconfig.build.json` | TypeScript configs |

---

## What needs REBUILDING (26 empty files)

### Config / build files (copy from `@strapi/plugin-i18n` and adapt)

| File | What to do |
|------|------------|
| `package.json` | Create based on i18n's package.json. Name: `@strapi/plugin-spaces`. Deps: `lodash/fp`, `@strapi/design-system`, `@strapi/icons`, `@strapi/utils`, `@strapi/types`. |
| `rollup.config.mjs` | Copy from i18n plugin |
| `jest.config.js` | Copy from i18n plugin |
| `.eslintrc.cjs` | Copy from i18n plugin |
| `server/tsconfig.json` | Copy from admin/tsconfig.json (same structure) |
| `server/tsconfig.build.json` | Copy from admin/tsconfig.build.json (same structure) |

### Server files to rebuild

| File | What it should do | Reference |
|------|-------------------|-----------|
| `bootstrap.ts` | 1. Register document-service middleware (`createMultitenancyMiddleware`) 2. Register lifecycle subscriber 3. Call `patchI18nForSpaces()` 4. Seed default spaces if none exist | `server/src/index.ts` imports it; `multitenancy.ts` and `lifecycles.ts` are the things it wires up |
| `register.ts` | 1. Inject `space` relation attribute onto space-scoped CTs 2. Inject hidden `spaces` M2M on `plugin::i18n.locale` 3. Register `resolve-space` middleware on content-api routes | `utils/index.ts` references services it sets up; `i18n-integration.ts` expects the M2M relation |
| `middlewares/resolve-space.ts` | Koa middleware: reads `X-Strapi-Space-Id` header, resolves space from DB, sets `ctx.state.spaceId` and `ctx.state.spaceSlug` | Referenced by `middlewares/index.ts` |
| `content-types/index.ts` | Barrel: `export default { space: require('./space') }` | Referenced by `server/src/index.ts` |
| `content-types/space/index.ts` | Barrel: `export default { schema: require('./schema.json') }` | Standard Strapi plugin pattern |
| `controllers/index.ts` | Barrel: `export default { space, move }` | Referenced by `server/src/index.ts` |
| `routes/admin.ts` | Admin API routes: `GET /spaces/mine`, `POST /spaces/move` with `admin::hasPermissions` policy | Referenced by `routes/index.ts` |
| `routes/index.ts` | Barrel: `export default { admin: require('./admin') }` | Referenced by `server/src/index.ts` |
| `services/spaces.ts` | CRUD for spaces: `getAll()`, `getBySlug()`, `getById()`, `create()`, `update()` using `strapi.db.query('plugin::spaces.space')` | Referenced by `services/index.ts`, used in `controllers/space.ts` and `services/move.ts` |
| `services/visibility.ts` | `isCTVisibleInSpace(contentType, spaceSlug)` — checks `pluginOptions.spaces.visibleIn` array (empty = visible everywhere) | Referenced by `services/index.ts`, used in `services/move.ts` |
| `services/permissions/actions.ts` | Registers `plugin::spaces.move-entry` permission action | Referenced by admin's `constants.ts` |

### Admin files to rebuild

| File | What it should do | Reference |
|------|-------------------|-----------|
| `index.ts` | Plugin register/bootstrap: register document actions (MoveToSpaceHeaderAction, MoveToSpaceBulkAction), inject SpaceChipColumn, add CTB custom fields (SpaceVisibility), register SpaceSwitcher | Translation keys in `en.json`, components already exist |
| `components/SpaceSwitcher.tsx` | Header dropdown to switch active space — stores current space slug in localStorage, adds `X-Strapi-Space-Id` header to all requests via `useFetchClient` interceptor | Translation keys: `switcher.heading`, `switcher.triggerLabel` |
| `components/SpaceDefaultPicker.tsx` | Multi-select for "Default in spaces" on locale settings page | Translation keys: `defaultPicker.*` |
| `components/DefaultInColumn.tsx` | Column cell showing which spaces a locale is default in | Translation key: `locales.defaultInColumn` |
| `utils/currentSpace.ts` | `getCurrentSpaceSlug()` — reads current space from localStorage | Used by `MoveToSpaceActions.tsx` |
| `utils/getTranslation.ts` | `getTranslation(id)` — prefixes with plugin namespace | Standard Strapi plugin pattern |

### External files to rebuild

| File | What it should do |
|------|-------------------|
| `spaces-design.html` | Full design document (was 150KB). Can be regenerated from the README and implementation code. |
| `packages/plugins/i18n/admin/src/i18n-plugin.ts` | i18n admin-side patches for spaces integration |
| `tests/api/plugins/spaces/space-isolation.test.api.js` | API-level integration test for space isolation |

### Test files to rebuild

| File | Reference |
|------|-----------|
| `services/__tests__/move.test.ts` | Test the `moveToSpace` service (see `services/move.ts`) |
| `services/__tests__/visibility.test.ts` | Test `isCTVisibleInSpace` (see `services/visibility.ts` once rebuilt) |

---

## Architecture summary

```
Request → resolve-space middleware (reads X-Strapi-Space-Id header)
        → ctx.state.spaceId / ctx.state.spaceSlug set
        → document-service multitenancy middleware
          → reads: inject space filter into params.filters
          → writes: stamp space FK into params.data
        → lifecycle subscriber (safety net for raw db.query bypasses)
```

**Content type opt-in**: `pluginOptions.spaces.scope: 'space'` in schema.json

**Visibility binding**: `pluginOptions.spaces.visibleIn: ['slug1', 'slug2']` (empty = visible everywhere)

**i18n integration**: Locales get a hidden `spaces` M2M relation. Read/write scoping via `settings-visibility` pattern. Per-space default locale via store key `default_locale_<spaceSlug>`.

## Key design decisions

1. Uses `params.filters` (not `params.lookup`) because `validateParams` throws on unknown lookup keys
2. Bypasses document service for move operations (uses `strapi.db.query` directly) because the multitenancy middleware would block cross-space writes
3. `AsyncLocalStorage`-based `runUnscoped()` for internal code that needs global reads (e.g., permission sync)
4. Empty `visibleIn` array = platform-wide (visible in every space) — convention shared with i18n locale binding
