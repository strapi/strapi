# Spaces Plugin — Handover

> **Status update (2026-07-30): the rebuild is complete.** Every file lost to the
> worktree corruption has been recreated, plus the i18n extension points they
> depended on. The plugin builds, lints, and its unit tests pass (37 spaces +
> 94 i18n server + 54 i18n front). The original rebuild guide below is kept for
> historical context; the "What needs REBUILDING" list is now DONE.

## What is this?

A **virtual multi-tenancy** plugin for Strapi 5 (`@strapi/plugin-spaces`). One deployment, one database, many isolated "Spaces". Architecture mirrors `@strapi/plugin-i18n` — a `space` dimension is injected via document-service middleware into every query on opted-in content types.

Design doc: `packages/plugins/spaces/docs/design.html` (regenerated from the README,
this handover and the implementation; the original 150 KB revision is gone).

## Current state (post-rebuild)

- **Branch**: `feature/spaces-multitenancy`, rebased onto current `develop`
  (2026-07-30, v5.51.1) with zero conflicts; versions and lockfile aligned.
- **Committed**: `9e632f7489` — the 29 surviving files + the original handover.
- **Rebuilt (uncommitted at the time of writing)**: all config/build files
  (`package.json`, `rollup.config.mjs`, `jest.config.js`, `.eslintrc.cjs`,
  `server/tsconfig*.json`, `LICENSE`), all missing server files (`register.ts`,
  `bootstrap.ts`, `middlewares/resolve-space.ts`, `content-types/*/index.ts`,
  `controllers/index.ts`, `routes/*`, `services/spaces.ts`, `services/visibility.ts`,
  `services/permissions/actions.ts`), all missing admin files (`index.ts`,
  `SpaceSwitcher.tsx`, `SpaceDefaultPicker.tsx`, `DefaultInColumn.tsx`,
  `SpaceScope.tsx`, `LocaleIntegration.tsx`, `utils/currentSpace.ts`,
  `utils/getTranslation.ts`, `utils/fetchInterceptor.ts`), the missing tests
  (`move.test.ts`, `visibility.test.ts`,
  `tests/api/plugins/spaces/space-isolation.test.api.js`), the i18n extension
  points (`setDefaultLocaleStrategy` in i18n's locales service;
  `i18n-plugin.ts` + form/table extension seams in i18n's admin), and the
  design doc (`packages/plugins/spaces/docs/design.html`).

## Deviations from the original rebuild guide

1. **resolve-space registration moved to `bootstrap.ts`** (guide said `register.ts`):
   core middlewares (`ctx.badRequest`, error handling) initialize _between_ register
   and bootstrap, so a register-time `strapi.server.use()` would run in front of them.
2. **i18n admin patches** are implemented as generic extension points
   (`registerLocaleFormExtension` / `registerLocaleTableColumn` exposed on
   `app.getPlugin('i18n').apis`, registry in `admin/src/i18n-plugin.ts`) rather than
   spaces-specific edits — i18n has zero dependency on spaces.
3. **`SpaceScope.tsx`** (CTB "Tenant scope" select) was added — the `ctb.scope.*`
   translation keys required it even though the original file list didn't name it.
4. The **space header interceptor** wraps `window.fetch` (idempotent, backend-URLs
   only) because the admin fetch client exposes no interceptor API.
5. `tests/app-template/package.json` now includes `@strapi/plugin-spaces` so
   regenerated API-test apps load the plugin (`yarn test:generate-app` required
   before `yarn test:api`).

## Architecture summary

```
Admin: SpaceSwitcher (localStorage slug) → window.fetch interceptor adds header
Request → resolve-space middleware (reads X-Strapi-Space-Id header, bootstrap-registered)
        → ctx.state.spaceId / ctx.state.spaceSlug set (400 on unknown/archived space)
        → document-service multitenancy middleware
          → reads: inject space filter into params.filters (clobbers user filter)
          → writes: stamp space FK into params.data
        → lifecycle subscriber (safety net for raw db.query bypasses)
```

**Content type opt-in**: `pluginOptions.spaces.scope: 'space'` in schema.json
(injects a `manyToOne` relation with `useJoinTable: false` → real `space_id` column).

**Visibility binding**: `pluginOptions.spaces.visibleIn: ['slug1', 'slug2']` (empty = visible everywhere)

**i18n integration**: Locales get a hidden `spaces` M2M relation. Read/write scoping via `settings-visibility` pattern. Per-space default locale via the `setDefaultLocaleStrategy` hook + store keys `default_locale_<spaceSlug>`; `listDefaults()` feeds the `isDefaultIn` arrays the Settings table renders.

## Key design decisions

1. Uses `params.filters` (not `params.lookup`) because `validateParams` throws on unknown lookup keys
2. Bypasses document service for move operations (uses `strapi.db.query` directly) because the multitenancy middleware would block cross-space writes
3. `AsyncLocalStorage`-based `runUnscoped()` for internal code that needs global reads (e.g., permission sync)
4. Empty `visibleIn` array = platform-wide (visible in every space) — convention shared with i18n locale binding

## Next slices (unchanged roadmap)

- Role → space mapping (`GET /spaces/mine` filtered per user; space-specific
  roles/users/permissions)
- API tokens / transfer tokens / webhooks through the settings-visibility pattern
- Media Library split per space
- Raw-DB read net (`beforeFindMany`/`beforeFindOne`/`beforeCount`), GraphQL coverage,
  subdomain routing, `config/spaces.ts` sync, components inheritance, CLI
