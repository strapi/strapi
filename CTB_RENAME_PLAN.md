# CTB Rename Migrations — Implementation Plan

> Working plan for building auto-generated rename migrations in the Content-Type Builder (CTB).
> Trimmed from the Notion handoff doc. Companion refs:
>
> - Problem doc: https://app.notion.com/p/37c8f35980748110aba9fc8aef982424
> - RFC: https://app.notion.com/p/1428f3598074800e8bf0cc6b022630c4
> - POC PR: https://github.com/strapi/strapi/pull/22191
> - Linear: CMS-635 (related: CG-979, CG-1001)
> - Open PR: https://github.com/strapi/strapi/pull/26622 (draft)
> - Branch: `ben/ctb-rename-migration-builder` (base: `develop`)

---

## Handoff status (2026-06-12)

**Implemented & tested (attribute renames):**

- Admin captures ordered rename hops per type and serializes them as a `renames[]`
  array (`reducer.ts`, `utils/cleanData.ts`). Confirmation modal in `prompt` mode
  (`DataManager/RenameMigrationModal.tsx`), wired in `DataManagerProvider.tsx`.
- Server `services/schema.ts` collects accepted renames and drives a CTB **rename
  resolver** (`services/migration-builder/index.ts`) that classifies each hop
  against pre-reload `strapi.db.metadata` and emits primitive DB operations.
- Generic **migration file builder** lives in `@strapi/database`
  (`migrations/file-builder.ts`, exposed as `strapi.db.migrations.createFileBuilder()`):
  `renameColumn` / `renameTable` / `updateRows`, guarded JS rendering, millisecond
  timestamps, collision suffixes.
- Coverage: scalar columns, relation join columns, relation join/link tables,
  components & dynamic zones, media (shared morph table, scoped by `related_type`).
  Ordered-path replay (chains/swaps/shifts/rename-back) with no synthetic temp
  column. Polymorphic `morph*` relations reported as unsupported (warned, not
  auto-migrated).
- Config `renameMigrations: 'prompt' | 'always' | 'never'` (default `'prompt'`),
  surfaced to the admin via the schema endpoint.
- Tests: `migration-builder.test.ts`, `schema.test.ts`, `config.test.ts`,
  `file-builder.test.ts`, `fresh-db-rename.test.ts` (real sqlite),
  `tests/api/core/content-type-builder/rename-migration.test.api.js`, plus admin
  reducer/cleanData/modal tests.

**Also implemented & tested (component-_level_ renames — CG-1001):**

- Moving a component to a new **category** changes its uid (`<category>.<name>`).
  The admin now persists that category change on existing components
  (`reducer.ts` `updateComponentSchema` + `FormModal.tsx`), so it is serialized on
  save. `services/schema.ts` derives the new uid exactly as `editComponent` does
  and calls a new resolver `addRenameComponent({ oldUid, newUid })`.
- The resolver (`services/migration-builder/index.ts`) scans the pre-reload schema
  for every content-type / component that references the component (as a
  `component` attribute or inside a `dynamiczone`), resolves each owner's physical
  `*_cmps` link table from `strapi.db.metadata`, and emits a guarded `updateRows`
  migrating the `component_type` value `oldUid → newUid` (deduped per table,
  in-flight tracking so a category-change chain replays verbatim). The component's
  own data table keeps its `collectionName` (the CTB never renames it), so no table
  rename is needed.
- Tests: unit (`migration-builder.test.ts` — single/multi-owner/DZ/chain/unknown/
  no-usage), `schema.test.ts` (component-rename collection + `never`), admin
  `reducerRenameComponent.test.ts`, and an API integration test
  (`rename-migration.test.api.js` — moving a component to a new category preserves
  embedded dynamic-zone data across restart).

**Content-type _level_ renames — N/A (no DB change possible):** a content type's
`collectionName` and `uid` are immutable in the CTB (`editContentType` only changes
`displayName`/`kind`/options, never `collectionName`). Renaming a content type is
purely cosmetic, so there is no table to migrate and no `addRenameContentType` is
needed.

**Also implemented & tested (optional CLI — `strapi rename:field`):**

- `strapi rename:field <uid> <oldName> <newName>` renames a content-type/component
  attribute **and** generates the data-preserving migration in one invocation. A
  thin CLI command (`packages/core/strapi/src/cli/commands/content-types/rename-field.ts`)
  boots a loaded strapi and delegates to a new
  `schema.renameAttribute(uid, oldName, newName)` service, which reuses the regular
  `updateSchema` → `generateRenameMigrations` → `createMigrationBuilder` flow (no
  duplicated rename logic, resolved against pre-reload metadata, honours
  `renameMigrations` mode + the same unsupported warning).
- Tests: `services/__tests__/schema.test.ts` (happy path, `never`, validation
  errors) and `tests/cli/tests/strapi/strapi/rename-field.test.cli.ts` (schema.json
  updated + one guarded `*.rename-fields.js` migration).

- `rename:component <uid> <newCategory>` is also implemented
  (`packages/core/strapi/src/cli/commands/components/rename.ts` → new
  `schema.renameComponent` service): moving a component to a new category changes
  its uid and emits the `component_type` migration across every `*_cmps` table that
  embeds it. Tested in `schema.test.ts` + `tests/cli/.../rename-component.test.cli.ts`.

**Not yet done:** nothing — all planned work (including the optional CLI for both
field and component renames) is complete. Possible follow-up only:
`rename:contentType` (cosmetic — a content type's uid/collectionName is immutable,
so there is nothing to migrate).

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
- `services/schema.ts`: builds changes, calls `generateRenameMigrations()` before reload, then `builder.writeFiles()`, emits events.
- Disk writes: `services/schema-builder/schema-handler.ts` `flush()`.
- Admin state: `admin/src/components/DataManager/reducer.ts` tracks `contentTypes`/`components` + per-attr `status` (NEW/CHANGED/REMOVED/UNCHANGED). `editAttribute` gets original `name` + new object → **transient old→new is available here**.
- Admin save: `DataManager/DataManagerProvider.tsx` `saveSchema()` → serializes via `utils/cleanData.ts` (includes ordered `renames[]` per updated type), optionally prompts via `RenameMigrationModal`, posts, polls `useServerRestartWatcher.ts`.
- Save button: `ContentTypeBuilderNav/ContentTypeBuilderNav.tsx`. Per-modal finish: `FormModalEndActions.tsx`.

### Config + JS/TS

- CTB config: `content-type-builder/server/src/config.ts` (`default: {}`) — new option goes here.
- DB settings type: `packages/core/types/src/core/config/database.ts` has `settings.forceMigration`, `runMigrations`, `useTypescriptMigrations`.
- Generator precedent: `packages/generators/generators/src/plops/migration.ts` — picks `.ts` when `tsUtils.isUsingTypeScriptSync(cwd)` else `.js`, writes `database/migrations/{timestamp}.{name}.{lang}` from Handlebars `templates/{js,ts}/migration.{js,ts}.hbs`. Runtime auto-generated migrations intentionally do **not** use this path; the database package emits CommonJS `.js` files to match the runner.

---

## Architecture

### 1. Capture rename intent (admin) — IMPLEMENTED

POC used a single `renamed: <oldName>` field. **Productionize into an ordered model** (user can do `a→b`, new `a`, `a→c` in one session).

- In `DataManager` state: ordered `pendingRenames` per CT/component: `{ kind: 'attribute'|'contentType'|'component', uid, oldName, newName }`.
- Derive from `status === 'CHANGED'` attrs where key changed, captured at `editAttribute` time. **Keep order.**
- Serialize through `cleanData.ts` → backend gets explicit ordered `renames` array on the update-schema payload (NOT inferred from diff).

### 2. Config option — `content-type-builder/server/src/config.ts` — IMPLEMENTED

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

### 3. Modal UX + deferred collection — IMPLEMENTED

- On global **Save** (`DataManagerProvider.tsx` `saveSchema()`), if config is
  `'prompt'`, a single confirmation modal (`RenameMigrationModal.tsx`) lists all
  pending rename hops across the save. Each hop has a checkbox (default: checked /
  preserve data). The user can uncheck a hop (field will be dropped and recreated
  empty) or cancel the whole save.
- **Write NOTHING until Save.** The modal only filters which renames reach the
  server; the server generates one migration file for all accepted hops.
- In `'always'` mode the modal is skipped. In `'never'` mode the server ignores
  renames entirely (legacy data-loss behaviour).

### 4. Backend: CTB resolver + generic migration file builder — IMPLEMENTED

Promote POC `server/src/services/migration-builder/index.ts` into a real CTB
resolver, invoked from `services/schema.ts` (batch path) so all accepted renames
land in one file. Drive from config + payload renames.

CTB resolver responsibilities (implemented today):

- `addRenameAttribute(uid, { oldName, newName })`: classifies the hop against
  pre-reload metadata and enqueues the appropriate primitive operation(s) on the
  database file builder (scalar column, join column, join table, component/DZ
  link-table `field` update, media morph-table update).
- `addRenameComponent({ oldUid, newUid })`: component-_level_ rename (category /
  uid change). Resolves every `*_cmps` link table referencing the component and
  emits a guarded `component_type` `updateRows` (`oldUid → newUid`).
- (future) `addDeleteComponent`, etc. (`addRenameContentType` is not needed — a
  content type's table/uid is immutable in the CTB).

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
if (
  (await knex.schema.hasTable('<table>')) &&
  (await knex.schema.hasColumn('<table>', '<oldCol>'))
) {
  await knex.schema.alterTable('<table>', (t) => t.renameColumn('<oldCol>', '<newCol>'));
}
```

- Always check `hasTable` before `hasColumn`: MySQL throws from `hasColumn` when
  the table is missing, while sqlite/postgres return a safe falsey result.
- `hasTable`/`hasColumn` cleaner than catching driver-specific errors (sqlite/pg/mysql/mariadb differ).
- Umzug records migration as executed once `up()` resolves without throwing → swallowed no-op still gets written to `strapi_migrations`, won't re-run.
- ✅ Tested on sqlite/postgres/mysql: fresh DB no-op recorded as complete, no
  double-rename after sync creates the final schema, and `renameColumn`,
  `renameTable`, `updateRows` primitives are covered.

**Verify during impl:**

- Provider order `[user, internal]`: fresh-DB rename-before-internal doesn't interact badly (guarded no-ops should be safe).
- Sync idempotency: after guarded no-op, sync creates new column from new schema — confirm no leftover `strapi_database_schema` state causes a follow-up drop.
- Transactions: existence-check + rename consistent inside trx for sqlite/pg/mysql.
- Follow-up: mariadb still not explicitly covered.

---

## Schema-sync interaction (§6)

Ideally **no** sync changes: migration renames column first, sync sees expected column, does nothing destructive. "Rename then re-add same name" also works.

Watch for:

- Index names no longer matching → sync rebuilds → index renaming intentionally deferred to sync (see questions doc #7).
- `forceMigration` default `true` → drops active → ensure rename lands before any drop decision.
- **TS runtime gap**: resolved — always emit `.js` (runner only globs `*.{js,sql}`).

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

**Unit — CTB rename resolver** (`content-type-builder/server/src/services/migration-builder/__tests__/migration-builder.test.ts`) — ✅ done:

- `addRenameAttribute` emits correct knex with **real identifiers** (mock `strapi.db.metadata`), incl. long-name hashed (v5).
- Ordered multi-rename: `a→b`, new `a`, `a→c` → correct, non-colliding, ordered.
- Ordered-path replay: `a→b→c` chain, `a→b→a` rename-back, user-routed `a↔b` swap, two-field `a→b, c→a` shift → all replayed verbatim, no synthetic temp column.
- Relation fixups: join column, join/link table, component/DZ link-table `field` update, media morph table (scoped by `related_type`), inverse-side no-op, polymorphic morph unsupported.
- Always JS (`module.exports`), even when `useTypescriptMigrations` is enabled.
- `writeFiles` collapses to single file; filename derivation; creates dir if missing; collision suffix.
- Guarded steps: generated code contains existence checks.

**Unit — database file builder** (`packages/core/database/src/migrations/__tests__/file-builder.test.ts`) — ✅ done:

- Renders guarded `renameColumn`, `renameTable`, `updateRows` (multi-where).
- Millisecond timestamp + collision suffix + CommonJS output.

**Unit — schema service** (`content-type-builder/server/src/services/__tests__/schema.test.ts`) — ✅ done:

- `generateRenameMigrations` wired; `never` skips; ordered hops replayed; component renames collected.

**Admin/front-end** — ✅ done:

- `reducerRenameAttribute.test.ts`: `editAttribute` records ordered pending rename w/ correct old/new.
- `cleanDataRename.test.ts`: `stateToRequestData` serializes `renames` array.
- `renameMigrationModal.test.ts`: `collectPendingRenames` / `applyRenameDecisions`.

**API integration** (`tests/api/core/content-type-builder/rename-migration.test.api.js`) — ✅ done (sqlite):

- Happy path: CT w/ data → rename attr → restart → column renamed, data preserved.
- Swap migration (ordered hops).
- Relation join-column rename.
- Component attr rename.
- Media field rename.
- Delete-then-reuse-name guard.

**Still needed:**

- ✅ **No migration when off**: `never` → data dropped (contrast test).
- **Dynamic zone** end-to-end (CG-979) — unit coverage exists; API test may need expansion. (Component-_level_ rename now has an end-to-end DZ API test in `rename-migration.test.api.js`.)
- ✅ Run across **postgres + mysql** (guards are driver-sensitive).
- ✅ **Fresh-DB / ordering (critical)**: guarded no-op migrations do not crash on
  empty DBs, are recorded executed, and do not double-rename after sync creates the
  final schema (sqlite/postgres/mysql unit coverage). Provider order is explicitly
  covered with a synthetic internal migration in the same runner pass.
- ✅ **CLI** (`tests/cli/`): `rename:field` updates `schema.json` + writes one migration
  (`rename-field.test.cli.ts`) and `rename:component` moves the component + writes the
  `component_type` migration (`rename-component.test.cli.ts`); plus `schema.test.ts`
  unit coverage for `renameAttribute` / `renameComponent`.
- **Regression:** existing CTB save/restart, sync, migration-runner tests pass; no change when `never`.

---

## Additional considerations (§10)

- **v5 identifier hashing**: long names hashed; never assume name==DB id. Use `Database.identifiers`/metadata. (PR #19732.)
- **Components `_cmps` cleanup**: deleting/renaming components touches `{model}_cmps` rows (`component_type`). Builder must encode this (POC `addDeleteComponent`). Bugs: #20931 + support tickets.
- **Component attr rename**: handled via link-table `field` value update (same path as dynamic zones). **Component _level_ rename** (moving the component to a new category → new uid) — **implemented** via `addRenameComponent` (`component_type` updates across every `*_cmps` table). The component's own data table keeps its `collectionName`.
- **Related bugs**: CG-979 (dynamic zone rename loses data) — **addressed** (DZ attribute renames now preserve data via the link-table `field` update). CG-1001 (renaming a component blocks reusing its old name) — **addressed**; component-_level_ renames now migrate `component_type` references so the old uid is freed cleanly.
- **Graceful type changes** (later): safe conversions (number↔text, date→text, date→unix int) w/ data-loss warnings. Out of MVP.
- **Helpers vs raw knex**: leaning inline knex for MVP transparency; revisit.
- **Down migrations**: skip for MVP; only meaningful with full coverage.
- **Feature flag**: keep behind flag/config to iterate safely.

---

## Build decisions (§11)

All decisions are resolved — see **`CTB_RENAME_QUESTIONS.md`** for the full record
and rationale.

- ✅ Runner records guarded no-op migrations as executed on fresh DB (`fresh-db-rename.test.ts`).
- ✅ Payload shape: ordered `renames: [{ oldName, newName }, …]` per updated content-type / component (the exact path of hops, so swaps/chains replay verbatim). NOT inferred from a diff.
- ✅ Builder ownership: generic file rendering/writing extracted to `@strapi/database` (`migrations/file-builder.ts`); CTB keeps only Strapi-domain rename resolution.
- ✅ Config modes renamed to `prompt` / `always` / `never` (default `prompt`).
- ✅ Always emit `.js` (never `.ts`) — runner only globs `*.{js,sql}`.
- ✅ Timestamp bugs fixed: migration filenames use a full **millisecond** timestamp (`2026.06.11T15.39.50.123`), not bare `2026` and not second-precision. `writeFiles` also appends a `-N` suffix on collision.
- ✅ Index renaming intentionally deferred to schema-sync (see questions doc #7).
- ✅ Provider order `[user, internal]` vs old internal-first — verified in
  `fresh-db-rename.test.ts`: guarded user migrations run and record before a
  registered internal migration, and the internal migration still runs safely.

---

## Key files (where to work) (§12)

- **Backend hook**: `content-type-builder/server/src/services/schema.ts`, `services/migration-builder/` (CTB rename resolver), `server/src/config.ts`.
- **Admin intent/modal/serialize**: `content-type-builder/admin/src/components/DataManager/{reducer.ts,DataManagerProvider.tsx,RenameMigrationModal.tsx,utils/cleanData.ts}`.
- **DB internals**: `core/database/src/migrations/{users.ts,index.ts,common.ts,storage.ts}`, `core/database/src/schema/{index.ts,diff.ts,builder.ts,schema.ts}`.
- **Generic migration file builder**: `core/database/src/migrations/file-builder.ts`.
- **Startup order**: `packages/core/core/src/Strapi.ts`.

---

## Suggested build order

### Done

1. ✅ Fresh-DB no-op recording — `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts` (real sqlite/postgres/mysql when reachable).
2. ✅ Backend: `renameMigrations` config + CTB rename resolver (real identifiers) wired into `services/schema.ts`, using the generic database migration file builder for guarded JS output.
3. ✅ API integration happy-path — `tests/api/core/content-type-builder/rename-migration.test.api.js` (sqlite; rename preserves data + rename+re-add).
4. ✅ Admin: ordered rename capture in reducer + serialization in `cleanData.ts`.
5. ✅ Admin: confirmation modal + per-rename opt-out (`prompt` mode) + config surfaced to admin (`RenameMigrationModal.tsx`).
6. ✅ Attribute-rename coverage: scalar, relation join column, relation join/link table, component, dynamic zone, media (morph relations reported unsupported).
7. ✅ Extract generic migration file builder into `@strapi/database` (`migrations/file-builder.ts`).

### Remaining

8. ✅ **Component _level_ renames** (category / uid change) incl. `_cmps` `component_type` bookkeeping — closes CG-1001. (Content-type _level_ renames are N/A: collectionName/uid are immutable in the CTB, so there is no table to migrate.)
9. ✅ Fresh-DB ordering across pg/mysql drivers.
10. ✅ Verify provider order `[user, internal]` doesn't interact badly with internal migrations on a fresh DB.
11. ✅ (optional) CLI `rename:field` + `rename:component` reusing the resolver + file
    builder (via `schema.renameAttribute` / `schema.renameComponent`). Follow-up only:
    `rename:contentType` (cosmetic — nothing to migrate).
