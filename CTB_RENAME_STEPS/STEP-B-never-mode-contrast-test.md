# Step B — `never`-mode contrast test (data IS dropped when off)

> ✅ Done 2026-06-12. Implemented in
> `tests/api/core/content-type-builder/rename-migration.test.api.js` and verified
> with `yarn test:api tests/api/core/content-type-builder/rename-migration.test.api.js --db=sqlite`.

> **You are a fresh agent.** Read this whole doc, then do the work. Everything you
> need to start is here. Shared background: `CTB_RENAME_PROGRESS.md`,
> `CTB_RENAME_PLAN.md`, repo-root `AGENTS.md`. Branch: `ben/ctb-rename-migration-builder`.

## Goal

Add a test proving that with `renameMigrations: 'never'`, renaming a field **drops
the old column and loses its data** (the legacy schema-sync behaviour). This is the
**contrast** to the happy-path tests: it confirms the feature is genuinely what
preserves data, and that `never` truly disables it end-to-end.

## Why it matters

Every existing rename test runs in the default/`always` path and asserts data is
**preserved**. Nothing asserts the negative. Without it we can't prove the config
switch works, and a regression that always-generates (ignoring `never`) would go
unnoticed.

## Background — how `never` works

`packages/core/content-type-builder/server/src/services/schema.ts`
→ `generateRenameMigrations()` returns early when the mode is `'never'`, so no
migration file is written. On the next reload, schema-sync sees the old column as
"removed" and the new one as "added" → it drops + recreates (data lost), because
`db.config.settings.forceMigration` defaults to `true`.

Mode is read via `strapi.plugin('content-type-builder').config('renameMigrations',
'prompt')`. Config option: `content-type-builder/server/src/config.ts`.

## Where to begin

- **Unit (already partly covered, verify/extend):**
  `packages/core/content-type-builder/server/src/services/__tests__/schema.test.ts`
  already has _"does not generate a migration when renameMigrations is never"_ and
  _"does not collect component renames when renameMigrations is never"_. Confirm
  these are sufficient at the unit level; the missing piece is the **end-to-end**
  data-loss assertion below.

- **API integration (the real gap):**
  `tests/api/core/content-type-builder/rename-migration.test.api.js` — the happy-path
  suites are your template. You'll add a `never`-mode describe block.

## The challenge: setting `renameMigrations: 'never'` in the API test app

The API tests boot a generated app (`tests/scripts/run-api-tests.js` →
`test-apps/api`). You need that app to run the CTB plugin with
`renameMigrations: 'never'`. Investigate the cleanest lever (in rough order of
preference):

1. A plugin config in the generated test app's `config/plugins` (see how the test
   app is generated in `tests/helpers/test-app.js`), **or**
2. An env var the test sets that the app's plugin config reads, **or**
3. A focused integration test that boots a `Database`/CTB service with the config
   set directly (less faithful but simpler).

Pick the lightest approach that genuinely exercises `getRenameMigrationMode()`
returning `'never'`. Document which lever you used in the test file header.

## What the test should assert

Mirroring the happy-path "renaming a field preserves its data after restart" test,
but inverted:

1. Create a CT with a `title` field, seed one entry.
2. Rename `title -> heading` (sending the same `renames: [...]` payload).
3. Restart.
4. Assert **data is lost**: e.g. the entry's `heading` is `null`/empty (column was
   dropped + recreated), and **no** `*.rename-fields.js` migration file was written.

Use `strapi.db.connection.schema.hasColumn(...)` and the migrations dir listing the
same way the happy-path tests inspect schema state.

## How to test

```bash
docker-compose -f docker-compose.test.yml up -d   # if you run on pg/mysql too
yarn test:api rename-migration
# plus
yarn jest packages/core/content-type-builder/server/src/services/__tests__/schema.test.ts
yarn test:ts && yarn lint && yarn prettier:check
```

## Acceptance criteria

- [x] An end-to-end test with `renameMigrations: 'never'` asserts the renamed
      field's data is **dropped** after restart.
- [x] The test asserts **no rename migration file** is generated in `never` mode.
- [x] It coexists with the existing happy-path suites without cross-contaminating
      config (clean setup/teardown of the `never` mode lever).
- [x] The config lever used is documented in the test file.

## Out of scope

- Changing the default mode or the `prompt`/`always` behaviour.

## When done

Mark Step B ✅ in `CTB_RENAME_STEPS/README.md` and update the matching row in
`CTB_RENAME_PROGRESS.md`.
