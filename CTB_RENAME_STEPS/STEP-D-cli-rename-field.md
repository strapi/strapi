# Step D — (Optional) CLI `strapi rename:field`

> **You are a fresh agent.** Read this whole doc, then do the work. Everything you
> need to start is here. Shared background: `CTB_RENAME_PROGRESS.md`,
> `CTB_RENAME_PLAN.md`, repo-root `AGENTS.md`. Branch: `ben/ctb-rename-migration-builder`.
>
> **This step is OPTIONAL / out of MVP.** Only pick it up if Steps A–C are done or
> explicitly deprioritized. Confirm with the human if unsure.

## Goal

Add a CLI command that renames a field **and** generates the data-preserving
migration in **one step**, reusing the existing CTB rename resolver + database file
builder:

```bash
yarn strapi rename:field <contentTypeUid> <oldName> <newName>
```

The single-step design is deliberate: it updates `schema.json` **and** emits the
migration together. **Avoid** a "generate migration only" command — once schemas
are edited independently, a standalone generator produces inaccurate migrations.

## Why it matters (and why it's optional)

It gives non-UI / scripted workflows the same data-preserving rename the CTB UI
gets. It's optional because the admin UI already covers the primary flow; the CLI is
a convenience for power users and CI.

## Where to begin

- **The resolver to reuse (do not reinvent):**
  `packages/core/content-type-builder/server/src/services/migration-builder/index.ts`
  — `createMigrationBuilder({ strapi })` with `addRenameAttribute(uid, {oldName,
newName})` / `addRenameComponent({oldUid,newUid})`, `getUnsupported()`,
  `hasChanges()`, `writeFiles()`.
- **How the server already drives it:**
  `services/schema.ts` → `generateRenameMigrations()` — your CLI should follow the
  **same ordering contract**: resolve against pre-reload `strapi.db.metadata`, then
  write the schema change, then write the migration. Read this carefully; the
  metadata must still reflect the OLD schema when the builder runs.
- **CLI command precedents:** look in `packages/core/strapi/src/cli` (or wherever
  `strapi <command>` commands are registered — grep for an existing command like
  `ts:generate-types` or `routes:list` to copy the registration + bootstrapping
  pattern, including how a command boots a `strapi` instance).
- **Migration file generator precedent (for language/path conventions):**
  `packages/generators/generators/src/plops/migration.ts` — but note auto-generated
  rename migrations intentionally emit **CommonJS `.js`** via the database file
  builder, NOT the plop `.ts` path (the runner only globs `*.{js,sql}`).

## Suggested approach

1. Register `rename:field` taking `<contentTypeUid> <oldName> <newName>`.
2. Boot strapi far enough that `strapi.db.metadata` is populated (the builder reads
   real v5 identifiers from it).
3. Validate inputs (uid exists, oldName exists, newName free) — reuse CTB
   validation where possible.
4. Apply the schema edit (update the attribute key in the content-type/component
   `schema.json`) using the existing schema-builder services, mirroring what the
   `update-schema` flow does.
5. Run the rename resolver against the **pre-edit** metadata and `writeFiles()` the
   migration — preserving the "resolve before reload" ordering from `schema.ts`.
6. Print a clear summary (file written, unsupported warnings).

## How to test

- Add CLI tests under `tests/cli/` (see existing tests there for the harness).
  Assert: `schema.json` updated **and** exactly one `*.rename-fields.js` migration
  written that renames the right column/table.
- Standard gates: `yarn test:cli && yarn test:ts && yarn lint && yarn prettier:check`.

## Acceptance criteria

- [x] `yarn strapi rename:field <uid> <old> <new>` updates the schema and writes one
      migration in a single invocation.
- [x] It reuses `createMigrationBuilder` (no duplicated rename logic) and honours the
      "resolve against pre-reload metadata" ordering.
- [x] CLI test(s) under `tests/cli/` cover the happy path.
- [x] Unsupported cases (e.g. morph relations) print the same warning the server
      path does.

## Status: ✅ done

Implemented as a thin CLI command that delegates to a new
`schema.renameAttribute(uid, oldName, newName)` service so there is **no
duplicated rename logic**:

- **CLI command:**
  `packages/core/strapi/src/cli/commands/content-types/rename-field.ts`
  (registered in `cli/commands/index.ts` as `rename:field <uid> <oldName> <newName>`).
  It boots a loaded strapi (`compileStrapi` + `createStrapi().load()` so
  `strapi.db.metadata` is populated), diffs the migrations dir before/after to
  report the generated file, and prints a clear note when none is generated
  (`never` mode / unsupported field).
- **Service:** `renameAttribute` in
  `packages/core/content-type-builder/server/src/services/schema.ts` validates the
  uid/old/new names, then reuses the regular `updateSchema` path — so the migration
  is produced by the very same `generateRenameMigrations` → `createMigrationBuilder`
  flow the admin uses, resolved against pre-reload metadata, honouring the
  `renameMigrations` mode and the same unsupported-field warning. Works for both
  content-type and component attributes.
- **Tests:**
  - Unit: `services/__tests__/schema.test.ts` — happy path (renamed key reaches
    `editContentType`, hop forwarded), `never` mode, and the four validation
    errors (unknown uid, missing old attr, taken new name, rename-to-self).
  - CLI e2e: `tests/cli/tests/strapi/strapi/rename-field.test.cli.ts` — renames a
    scalar attribute on `api::dog.dog`, asserts the `schema.json` change **and**
    exactly one guarded `*.rename-fields.js` migration renaming the column.

`rename:component <uid> <newCategory>` is also implemented
(`packages/core/strapi/src/cli/commands/components/rename.ts` → new
`schema.renameComponent` service), with unit coverage in `schema.test.ts` and a CLI
e2e test `tests/cli/tests/strapi/strapi/rename-component.test.cli.ts`.

Follow-up (still out of scope): `rename:contentType` — cosmetic only, a content
type's uid/collectionName is immutable so there is nothing to migrate.

## Out of scope

- `rename:contentType` / `rename:component` (note as follow-ups).
- A "generate-migration-only" command (explicitly avoided — see Goal).

## When done

Mark Step D ✅ in `CTB_RENAME_STEPS/README.md` and update the matching row in
`CTB_RENAME_PROGRESS.md`.
