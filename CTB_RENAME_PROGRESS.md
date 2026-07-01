# CTB Rename Migrations — Progress Tracker

> Single source of truth for **what is done** and **what is missing** on the
> auto-generated rename migrations feature. Companion docs:
>
> - `CTB_RENAME_PLAN.md` — implementation plan + how Strapi works today.
> - `CTB_RENAME_QUESTIONS.md` — resolved build decisions and their rationale.
> - `CTB_RENAME_STEPS/` — **one kickoff brief per remaining step.** To pick up a
>   step, open a fresh AI and point it at the single matching
>   `CTB_RENAME_STEPS/STEP-*.md` file (start with `CTB_RENAME_STEPS/README.md`).
>
> Branch: `ben/ctb-rename-migration-builder` (base: `develop`).
> Linear: CMS-635 (related: CG-979, CG-1001). PR: #26622 (draft).
> Last updated: 2026-06-12.

---

## TL;DR

| Area                                                           | Status                    |
| -------------------------------------------------------------- | ------------------------- |
| Attribute renames (scalar/relation/component/media)            | ✅ done + tested          |
| Ordered-path replay (chains / swaps / shift / rename-back)     | ✅ done + tested          |
| Component-_level_ renames (category → uid change, CG-1001)     | ✅ done + tested          |
| Admin capture + confirmation modal (`prompt`/`always`/`never`) | ✅ done + tested          |
| Generic DB migration file builder (`@strapi/database`)         | ✅ done + tested          |
| Fresh-DB no-op guards on **sqlite/postgres/mysql**             | ✅ done + tested          |
| Fresh-DB ordering on **postgres + mysql**                      | ✅ verified               |
| `never`-mode contrast test (data dropped when off)             | ✅ done + tested          |
| Provider-order `[user, internal]` fresh-DB interaction         | ✅ verified               |
| CLI `strapi rename:field` (optional)                           | ✅ done + tested          |
| CLI `strapi rename:component` (optional)                       | ✅ done + tested          |
| Content-type _level_ rename                                    | ➖ N/A (immutable in CTB) |

Legend: ✅ done · ⬜ missing/todo · ➖ not applicable.

---

## Done

### 1. Admin — rename capture & UX

- Ordered per-type `renames: [{ oldName, newName }]` captured at `editAttribute`
  time, preserving the exact hop sequence (chains/swaps replay verbatim). NEW
  fields are never tracked.
  - `admin/src/components/DataManager/reducer.ts` (`recordRename`).
  - `admin/src/components/DataManager/utils/cleanData.ts` (serialization).
- Component-_level_ rename capture: a **category** change on an existing component
  is persisted (it changes the uid) so it serializes on save.
  - `reducer.ts` `updateComponentSchema` (+ `DataManagerContext.ts` type).
  - `admin/src/components/FormModal/FormModal.tsx` (passes `category` on edit).
- Confirmation modal in `prompt` mode listing all pending hops, per-hop opt-out.
  - `admin/src/components/DataManager/RenameMigrationModal.tsx`, wired in
    `DataManagerProvider.tsx`.
- Config mode surfaced to admin via the schema endpoint.

### 2. Server — CTB rename resolver

`packages/core/content-type-builder/server/src/services/migration-builder/index.ts`

- `addRenameAttribute(uid, { oldName, newName })` classifies each hop against
  pre-reload `strapi.db.metadata` (real v5 identifiers, not `snakeCase`) and emits
  the right primitive op:
  - scalar column → `renameColumn`
  - single-owner relation join column (`<field>_id`) → `renameColumn`
  - relation join/link table → `renameTable`
  - component / dynamic zone (link-table `field` value) → guarded `updateRows`
  - media (shared `files_related_morphs`, scoped by `related_type`) → `updateRows`
  - inverse side of a bidirectional relation → no-op
  - polymorphic `morph*` → unsupported (warned, not migrated)
- `addRenameComponent({ oldUid, newUid })` (component-_level_ rename): resolves
  every `*_cmps` link table referencing the component and migrates the
  `component_type` value `oldUid → newUid` (deduped per table, in-flight tracking
  so a category-change chain replays verbatim).
- Ordered-path replay with no synthetic temp column; per-uid in-flight map.

### 3. Server — schema service wiring

`packages/core/content-type-builder/server/src/services/schema.ts`

- `collectRenames` (attribute hops) + `collectComponentRenames` (derives new uid
  from `category`, same logic as `editComponent`).
- `generateRenameMigrations` runs **before** reload (while metadata is pre-rename),
  honours `renameMigrations` mode (`never` skips), warns on unsupported, writes a
  single migration file for the whole save.

### 4. `@strapi/database` — generic migration file builder

`packages/core/database/src/migrations/file-builder.ts`
(exposed as `strapi.db.migrations.createFileBuilder()`)

- Domain-agnostic op queue: `renameColumn` / `renameTable` / `updateRows`.
- Guarded CommonJS `.js` rendering (`hasTable` before `hasColumn` for
  MySQL-safe fresh-DB checks).
- Millisecond timestamps + `-N` collision suffix; writes into the configured
  runner dir; always `.js` (the runner only globs `*.{js,sql}`).

### 5. Config

`content-type-builder/server/src/config.ts` — `renameMigrations: 'prompt' |
'always' | 'never'` (default `'prompt'`).

### 6. Tests (all green)

- Unit — resolver: `migration-builder/__tests__/migration-builder.test.ts`
  (scalar, long-hashed names, relations, component/DZ, media, morph-unsupported,
  ordered replay, **component-level renames**: single/multi-owner/DZ/chain/
  unknown/no-usage; filename + write behaviour). 30 tests.
- Unit — file builder: `database/src/migrations/__tests__/file-builder.test.ts`.
- Unit — schema service: `services/__tests__/schema.test.ts` (attribute + component
  rename collection, `never` skip, unsupported warn). 21 tests.
- Unit — fresh-DB: `database/src/migrations/__tests__/fresh-db-rename.test.ts`
  (real sqlite/postgres/mysql when reachable; guarded no-op recorded as
  executed; no double-rename; `renameColumn`/`renameTable`/`updateRows` covered;
  user-provider-before-internal-provider order verified).
- Admin: `reducerRenameAttribute.test.ts`, `reducerRenameComponent.test.ts`,
  `cleanDataRename.test.ts`, `renameMigrationModal.test.ts` (full DataManager
  suite: 139 tests).
- API integration: `tests/api/core/content-type-builder/rename-migration.test.api.js`
  (sqlite/postgres/mysql, 10 tests): attribute rename, rename+re-add, swap,
  relation join-table, component-field, field-inside-component, **component
  category move (DZ)**, media, delete-then-reuse guard, `never`-mode data-loss
  contrast.

### 7. Fresh-DB pg/mysql verification

Fresh-DB guarded renames are verified on postgres + mysql. MySQL exposed that
`hasColumn` throws when the table is missing, so generated `renameColumn` and
`updateRows` guards now check `hasTable` first. Unit coverage exercises
`renameColumn`, `renameTable`, and `updateRows`; API `rename-migration` passes on
both drivers.

---

## Missing / TODO

Ordered by priority. Each has a self-contained kickoff brief in `CTB_RENAME_STEPS/`
— point a fresh agent at the one file to start.

### B. `never`-mode contrast test ✅

→ `CTB_RENAME_STEPS/STEP-B-never-mode-contrast-test.md`

Implemented in `tests/api/core/content-type-builder/rename-migration.test.api.js`.
With `renameMigrations: 'never'`, the schema update writes no rename migration and
schema-sync drops/recreates the field, leaving the renamed value empty.

### C. Provider-order `[user, internal]` fresh-DB interaction ✅

→ `CTB_RENAME_STEPS/STEP-C-provider-order.md`

Verified in `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts`.
The combined provider runs guarded user migrations before a registered internal
migration, records both tracking tables, and leaves the internal migration safe to
run on a fresh DB.

### D. CLI `strapi rename:field` ✅ (optional, out of MVP)

→ `CTB_RENAME_STEPS/STEP-D-cli-rename-field.md`

Updates the schema **and** generates the migration in one invocation, reusing the
resolver + file builder via a new `schema.renameAttribute(uid, oldName, newName)`
service (no duplicated rename logic). CLI command:
`packages/core/strapi/src/cli/commands/content-types/rename-field.ts`
(`rename:field <uid> <oldName> <newName>`). Honours `renameMigrations` mode and the
same unsupported-field warning as the admin save; works for content-type and
component attributes. Tested by `services/__tests__/schema.test.ts` (happy path,
`never`, validation errors) and `tests/cli/.../rename-field.test.cli.ts`
(schema.json updated + one guarded migration).

`rename:component <uid> <newCategory>` is also implemented
(`packages/core/strapi/src/cli/commands/components/rename.ts` → new
`schema.renameComponent(uid, newCategory)` service): moving a component to a new
category changes its uid and emits the `component_type` migration across every
`*_cmps` table that embeds it. Tested by `services/__tests__/schema.test.ts`
(happy path, `never`, validation errors) and
`tests/cli/.../rename-component.test.cli.ts` (component file moved + one guarded
`component_type` migration).

---

## Out of scope / decided

- **Content-type _level_ rename — N/A.** `collectionName`/`uid` are immutable in
  the CTB (`editContentType` only edits `displayName`/`kind`/options), so a
  content-type rename is cosmetic with nothing to migrate. No
  `addRenameContentType`.
- **Down migrations** — skipped for MVP (only meaningful with full coverage).
- **Index renaming** — deferred to schema-sync (rebuilds after column/table rename).
- **Graceful type changes** (number↔text, date conversions) — future, out of MVP.
- **Full-migrations mode** (initial schema + history, `forceMigration: false`) —
  large effort, likely Strapi 7.
- **Always JS** (never TS) — runner only globs `*.{js,sql}`; TS dir resolves to the
  compiled output, so a runtime `.ts` would silently never run.

---

## Pre-PR checklist

```bash
yarn test:unit && yarn test:front && yarn test:ts && yarn lint && yarn prettier:check
# plus, for this feature:
yarn test:api rename-migration            # sqlite (done)
yarn test:api rename-migration --db=postgres   # done
yarn test:api rename-migration --db=mysql      # done
```
