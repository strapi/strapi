# CTB Rename Migrations — Implementation Plan

> Working plan for building auto-generated rename migrations in the Content-Type Builder (CTB).
> Trimmed from the Notion handoff doc. Companion refs:
>
> - Problem doc: https://app.notion.com/p/37c8f35980748110aba9fc8aef982424
> - RFC: https://app.notion.com/p/1428f3598074800e8bf0cc6b022630c4
> - POC PR: https://github.com/strapi/strapi/pull/22191
> - Linear: CMS-635 (also fixes CG-979, CG-1001)
> - Branch: `develop`

---

## Goal

When a user renames an attribute (later: content-type/component) in the CTB, generate a DB migration file that renames the underlying column/table so data is preserved across all environments — instead of schema-sync dropping the old column and creating a new empty one.

**Deliverable = a generated migration FILE** (travels with code, replayed per-env), not a runtime DB patch. The migration must run **before** schema-sync (it already does — see ordering below).

---

## How Strapi works today (verified, branch `develop`)

### Startup order — `packages/core/core/src/Strapi.ts` `bootstrap()`

1. build models → `this.db.init({ models })`
2. `strapi::content-types.beforeSync`
3. `this.db.schema.sync()`
4. repair / license / `afterSync` / store schemas

### Inside `db.schema.sync()` — `packages/core/database/src/schema/index.ts`

1. `if (db.migrations.shouldRun()) db.migrations.up()` — **migrations run FIRST**
2. `syncSchema()` compares stored schema hash, creates/drops/alters

### Migration runner

- User migrations: `packages/core/database/src/migrations/users.ts` — Umzug, `glob: ['*.{js,sql}', { cwd: database/migrations }]`. **Only `*.js`/`*.sql` globbed today — TS NOT globbed (sharp edge, see Open Items).**
- Signature: `packages/core/database/src/migrations/common.ts` — `(knex: Knex.Transaction, db: Database) => Promise<void>`, each wrapped in a transaction.
- Tracking tables: `strapi_migrations` (user) / `strapi_migrations_internal` (internal), in `storage.ts`; rows ordered by `time`.
- Provider order: `packages/core/database/src/migrations/index.ts` = `[userProvider, internalProvider]` — **user runs BEFORE internal** (opposite of old RFC). Verify fresh-DB safety.
- Internal migrations example using `renameColumn`/`renameTable`: `internal-migrations/5.0.0-01-convert-identifiers-long-than-max-length.ts`.
- Knex access in migrations: `db.connection`, `db.getSchemaConnection(trx)` in `packages/core/database/src/index.ts`.

### Schema sync / diff (the data-loss path)

- `schema/schema.ts`: maps metadata → columns via `attribute.columnName || key` → renamed attr = **new column name**.
- `schema/diff.ts`: 3-way diff (`strapi_database_schema` vs actual DB vs new schema) flags old column **removed**, new **added**.
- `schema/builder.ts`: `dropColumn()` + drops gated by `db.config.settings.forceMigration` (**defaults `true`**) → data loss happens by default.

### CTB save flow

- Batch route: `POST /content-type-builder/update-schema` → `controllers/schema.ts` (dev-only). Sets `strapi.reload.isWatching = false`, calls `getService('schema').updateSchema(data)`, then `setImmediate(() => strapi.reload())`.
- `services/schema.ts`: builds changes, `builder.writeFiles()`, emits events. **Has a TODO: "handle renaming migrations here by comparing attr name & attr.properties.name" — THIS is the backend hook point.**
- Disk writes: `services/schema-builder/schema-handler.ts` `flush()`.
- Admin state: `admin/src/components/DataManager/reducer.ts` tracks `contentTypes`/`components` + per-attr `status` (NEW/CHANGED/REMOVED/UNCHANGED). `editAttribute` gets original `name` + new object → **transient old→new is available here**.
- Admin save: `DataManager/DataManagerProvider.tsx` `saveSchema()` → serializes via `utils/cleanData.ts` (emits `{ action, name, properties }`, **drops `name` from properties — no `oldName` today**), posts, polls `useServerRestartWatcher.ts`.
- Save button: `ContentTypeBuilderNav/ContentTypeBuilderNav.tsx`. Per-modal finish: `FormModalEndActions.tsx`.

### Config + JS/TS

- CTB config: `content-type-builder/server/src/config.ts` (`default: {}`) — new option goes here.
- DB settings type: `packages/core/types/src/core/config/database.ts` has `settings.forceMigration`, `runMigrations`, `useTypescriptMigrations`.
- Generator precedent: `packages/generators/generators/src/plops/migration.ts` — picks `.ts` when `tsUtils.isUsingTypeScriptSync(cwd)` else `.js`, writes `database/migrations/{timestamp}.{name}.{lang}` from Handlebars `templates/{js,ts}/migration.{js,ts}.hbs`. Runtime auto-generated migrations intentionally do **not** use this path; the database package emits CommonJS `.js` files to match the runner.

---

## Architecture

### 1. Capture rename intent (admin)

POC used a single `renamed: <oldName>` field. **Productionize into an ordered model** (user can do `a→b`, new `a`, `a→c` in one session).

- In `DataManager` state: ordered `pendingRenames` per CT/component: `{ kind: 'attribute'|'contentType'|'component', uid, oldName, newName }`.
- Derive from `status === 'CHANGED'` attrs where key changed, captured at `editAttribute` time. **Keep order.**
- Serialize through `cleanData.ts` → backend gets explicit ordered `renames` array on the update-schema payload (NOT inferred from diff).

### 2. Config option — `content-type-builder/server/src/config.ts`

```javascript
module.exports = {
  default: {
    // 'prompt' (default) | 'always' | 'never'
    renameMigrations: 'prompt',
  },
  validator(config) {
    // assert one of the three allowed values
  },
};
```

Read via `strapi.plugin('content-type-builder').config('renameMigrations', 'prompt')`. Expose to admin.

- `never`: never generate (current behaviour).
- `always`: generate for every rename, no prompt.
- `prompt` (default): prompt per rename, remember answers.

### 3. Modal UX + deferred collection

- On closing edit-field modal (`FormModalEndActions.tsx`), if config is `prompt`, ask: **"Do you want to generate a migration for this field so that you keep the data in it?"** (Yes/No per rename).
- **Write NOTHING yet.** Store answer alongside pending rename (`generate: true|false`).
- Only on global **Save** (`ContentTypeBuilderNav`/`saveSchema`) is the request sent with accepted renames.
- Result: **ONE** migration file per save containing all accepted renames (e.g. `..._rename_fields.js`).

### 4. Backend: CTB resolver + generic migration file builder

Promote POC `server/src/services/migration-builder/index.ts` into a real CTB
resolver, invoked from `services/schema.ts` (batch path) so all accepted renames
land in one file. Drive from config + payload renames.

CTB resolver responsibilities:

- `addRenameAttribute(uid, { oldName, newName })`: rename column; update relation join columns/tables; (optional) rename indexes.
- (later) `addRenameContentType`, `addRenameComponent`, `addDeleteComponent`, etc.
- Resolve Strapi-specific intent into physical DB operations by using old
  metadata (`strapi.db.metadata`) before reload.

**CRITICAL: use real DB identifiers, NOT `snakeCase`.** POC used `snakeCase(name)`; production must resolve true names via `strapi.db.metadata` + `Database.identifiers` (v5 long-identifier hashing means names don't map 1:1). Builder reads from **old** metadata (before reload).

Generic migration file builder responsibilities (`@strapi/database`):

- Exposed via `strapi.db.migrations.createFileBuilder()`.
- Domain-agnostic operation queue: `renameColumn`, `renameTable`, `updateRows`.
- Render guarded CommonJS `.js` migration files.
- Write into the configured migration runner directory with millisecond
  timestamps and collision suffixes.

This keeps CTB responsible for content-type/component/relation/media semantics,
while `@strapi/database` owns only database-runner mechanics and primitive DB
operations.

Generated output shape:

```javascript
// Migration file generated by Strapi at <ISO>
module.exports = {
  async up(knex) {
    if (await knex.schema.hasColumn('<table>', '<oldCol>')) {
      await knex.schema.alterTable('<table>', (t) => {
        t.renameColumn('<oldCol>', '<newCol>');
      });
    }
    // ...one block per accepted rename, plus relation/index fixups
  },
  async down(knex) {
    // optional; only once full coverage exists
  },
};
```

### 4b. Ordered-path replay (swaps, chains) — IMPLEMENTED

The admin records the **exact ordered sequence of rename hops** the user performed
(per content-type / component) and the server replays each hop verbatim. No synthetic
temp columns, no reordering.

- **Why it's always safe:** the Content-Type Builder forbids two fields sharing a name at
  any instant. So at the moment the user performs each rename `x → y`, `y` is free; the DB
  columns mirror the field names (which were created before this save), so replaying the
  hops in order never targets an occupied column.
- **Chains** (`a→b→c`): recorded as `a→b`, `b→c` and replayed in order.
- **Swaps** (`a↔b`): the user themselves routes through an intermediate name
  (`a→tmp`, `b→a`, `tmp→b`); we record and replay that exact path — the user's own `tmp`
  column is the "temp", so we never need to synthesize one.
- **Rename-back** (`a→b→a`): replayed verbatim (a runtime no-op that preserves data).
- **New fields** (status `NEW`) are never tracked — they have no data and don't exist in
  the DB yet.
- The builder keeps a small per-uid "in-flight column" map so a continuation hop
  (`tmp → final`) is recognised as part of an existing chain (inheriting its scalar/
  migratable decision) rather than treated as an unknown attribute.
- Every physical step is still guarded with `hasColumn` for fresh-DB safety.

**Payload:** an ordered `renames: [{ oldName, newName }, …]` array on each updated
content-type / component (not inferred per-attribute, so intermediate hops survive).

### 5. JS vs TS selection — RESOLVED: always JS

- **Always emit a CommonJS `.js` migration**, including on TypeScript projects.
- Why not TS: the runner only globs `*.{js,sql}` (`migrations/users.ts`), and when `useTypescriptMigrations === true` the migrations dir resolves to the compiled output dir (`Strapi.ts`). A `.ts` file written at runtime would silently never run → data loss. A `.js` file is executed in both JS and TS projects.
- Write path uses the configured runner dir (`db.config.settings.migrations.dir`), which is exactly where the runner looks.

---

## The hard part: fresh-database / ordering (§5)

**Scenario:** dev accumulates rename migrations, then first deploy to a brand-new empty DB. Rename migration references a table/column that never existed there.

**Why tricky:**

- Migrations run **before** sync → on fresh DB tables don't exist yet → `renameColumn`/`alterTable` throws "no such table/column".
- Migration must **not** fail startup, but must still be **recorded as done** so it never re-runs after sync creates the tables (re-running would wrongly rename the new column).

**Approach: guarded existence checks** (preferred over blind try/catch — don't mask real errors):

```javascript
if (await knex.schema.hasColumn('<table>', '<oldCol>')) {
  await knex.schema.alterTable('<table>', (t) => t.renameColumn('<oldCol>', '<newCol>'));
}
```

- `hasTable`/`hasColumn` cleaner than catching driver-specific errors (sqlite/pg/mysql/mariadb differ).
- Umzug records migration as executed once `up()` resolves without throwing → swallowed no-op still gets written to `strapi_migrations`, won't re-run.
- **Add a test for exactly this** (fresh DB no-op recorded as complete).

**Verify during impl:**

- Provider order `[user, internal]`: fresh-DB rename-before-internal doesn't interact badly (guarded no-ops should be safe).
- Sync idempotency: after guarded no-op, sync creates new column from new schema — confirm no leftover `strapi_database_schema` state causes a follow-up drop.
- Transactions: existence-check + rename consistent inside trx for all 4 DBs.
- If uniform existence-check impossible across drivers, document per-driver fallback here.

---

## Schema-sync interaction (§6)

Ideally **no** sync changes: migration renames column first, sync sees expected column, does nothing destructive. "Rename then re-add same name" also works.

Watch for:

- Index names no longer matching → sync rebuilds → consider renaming indexes in migration.
- `forceMigration` default `true` → drops active → ensure rename lands before any drop decision.
- **TS runtime gap**: `users.ts` only globs `*.js`/`*.sql`. Decide: (a) keep emitting JS, or (b) extend glob/resolver for compiled TS in `outDir`. **Open implementation item.**

---

## Future (out of MVP)

### Full-migrations mode (§7)

Generate an **initial migration** = current schema (everything `strapi db sync` creates on first boot) + migrations for ALL changes → complete code-driven history. Fixes fresh-DB problem (creates run before renames → guards unnecessary). New builder methods: `addCreateContentType/Component/Attribute`, `addDeleteAttribute/ContentType/Component`. Lets users set `forceMigration: false`. Big effort — likely Strapi 7.

### CLI (§8)

MVP: update schema **and** generate migration in one step (avoids generate-before-edit trap):

```bash
yarn strapi rename:field <contentTypeUid> <oldName> <newName>
```

Reuses the CTB rename resolver plus the generic database migration file builder.
Avoid "generate migration only" (inaccurate once schemas edited). Later:
`rename:contentType`, `rename:component`.

---

## Test plan (§9)

**Unit — MigrationBuilder** (`content-type-builder/server/__tests__`):

- `addRenameAttribute` emits correct knex with **real identifiers** (mock `strapi.db.metadata`), incl. long-name hashed (v5).
- Ordered multi-rename: `a→b`, new `a`, `a→c` → correct, non-colliding, ordered.
- Ordered-path replay: `a→b→c` chain, `a→b→a` rename-back, user-routed `a↔b` swap, two-field `a→b, c→a` shift → all replayed verbatim, no synthetic temp column.
- Relation fixups: renaming relation-backing attr updates join column/table.
- Template rendering: always JS (`module.exports`), even when `useTypescriptMigrations` is enabled (a `.ts` file would never be globbed by the runner → data loss).
- `writeFiles` collapses to single file; filename derivation; creates dir if missing.
- Guarded steps: generated code contains existence checks.
- Config: `never`→nothing, `always`→file, `prompt`→honors per-rename flags.

**Admin/front-end** (`content-type-builder/admin/__tests__`, Vitest/RTL):

- `editAttribute` records ordered pending rename w/ correct old/new.
- Modal only in `prompt` mode; suppressed otherwise.
- Nothing written before Save; on Save payload = exactly accepted renames.
- `cleanData`/`stateToRequestData` serializes `renames` array.
- Reducer order-of-ops stress (rename/recreate/rename same name).

**API integration** (`tests/api/`, follow POC `cleanup-after-delete.test.api.js`: create schema, seed, `restart()`, assert DB):

- **Happy path**: CT w/ data → rename attr → restart → column renamed, data preserved, API returns under new name.
- **Rename + re-add**: `a→b` + new `a` → `b` keeps data, `a` empty.
- **No migration when off**: `never` → data dropped (locks the contrast).
- **Component attr rename** + **dynamic zone** (CG-979).
- Run across **sqlite + postgres + mysql** (guards are driver-sensitive).

**Fresh-DB / ordering (critical):**

- Generate rename migration in DB A → point app at empty DB B → first boot must NOT crash, migration **recorded executed** in `strapi_migrations`, sync creates correct final schema.
- Boot again → no re-run, no double-rename.

**CLI** (`tests/cli/`, if shipped): `rename:field` updates `schema.json` + writes one migration; idempotent re-run.

**Regression:** existing CTB save/restart, sync, migration-runner tests pass; no change when `never`.

---

## Additional considerations (§10)

- **v5 identifier hashing**: long names hashed; never assume name==DB id. Use `Database.identifiers`/metadata. (PR #19732.)
- **Components `_cmps` cleanup**: deleting/renaming components touches `{model}_cmps` rows (`component_type`). Builder must encode this (POC `addDeleteComponent`). Bugs: #20931 + support tickets.
- **Component attr rename ≠ normal attr rename** (POC TODO in `components.ts`). Handle separately.
- **Confirmed bugs fixed**: CG-979 (dynamic zone rename loses data), CG-1001 (component rename blocks reusing old name).
- **Graceful type changes** (later): safe conversions (number↔text, date→text, date→unix int) w/ data-loss warnings. Out of MVP.
- **Helpers vs raw knex**: leaning inline knex for MVP transparency; revisit.
- **Down migrations**: skip for MVP; only meaningful with full coverage.
- **Feature flag**: keep behind flag/config to iterate safely.

---

## Open questions to resolve during build (§11)

See **`CTB_RENAME_QUESTIONS.md`** for decisions needing Ben's confirmation.

Resolved during build:

- ✅ Runner records guarded no-op migrations as executed on fresh DB (`fresh-db-rename.test.ts`).
- ✅ Payload shape: per-attribute `oldName` on `action: 'update'` attributes (order preserved via attributes array).
- ✅ Timestamp bugs fixed: migration filenames use a full **millisecond** timestamp (`2026.06.11T15.39.50.123`), not bare `2026` and not second-precision. Auto-generated saves can land in the same second, so second precision collided and Umzug skipped the second migration (silent data loss). `writeFiles` also appends a `-N` suffix if a file with the same name somehow exists.
- ⬜ Provider order `[user, internal]` vs old internal-first — guarded no-ops assumed safe; not explicitly tested against internal migrations.
- ⬜ TS runtime / index renaming — see questions doc.

---

## Key files (where to work) (§12)

- **Admin intent/modal/serialize**: `content-type-builder/admin/src/components/DataManager/{reducer.ts,DataManagerProvider.tsx,utils/cleanData.ts}`, `components/FormModalEndActions.tsx`, `components/ContentTypeBuilderNav/ContentTypeBuilderNav.tsx`.
- **Backend hook**: `content-type-builder/server/src/services/schema.ts` (rename TODO), `services/migration-builder/` (CTB resolver), `server/src/config.ts`.
- **DB internals**: `core/database/src/migrations/{users.ts,index.ts,common.ts,storage.ts}`, `core/database/src/schema/{index.ts,diff.ts,builder.ts,schema.ts}`.
- **Generic migration file builder**: `core/database/src/migrations/file-builder.ts`.
- **Startup order**: `packages/core/core/src/Strapi.ts`.

---

## Suggested build order

### Done (2026-06-11)

1. ✅ Fresh-DB no-op recording — `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts` (real sqlite DB).
2. ✅ Backend: `renameMigrations` config + CTB rename resolver (real identifiers) wired into `services/schema.ts`, using the generic database migration file builder for guarded JS output.
3. ✅ API integration happy-path — `tests/api/core/content-type-builder/rename-migration.test.api.js` (sqlite; rename preserves data + rename+re-add).
4. ✅ Admin: ordered rename capture in reducer (`oldName` tracking) + serialization in `cleanData.ts`.

### Remaining

5. ⬜ Admin: modal UX + per-rename opt-out (`prompt` mode) + expose config to admin.
6. ⬜ Fresh-DB ordering across pg/mysql drivers (sqlite proven).
7. ⬜ (optional) CLI `rename:field`.
8. ⬜ Relation / component / dynamic-zone rename support (MVP skips these with a warning).
