# Step A — Fresh-DB ordering on postgres + mysql

> **You are a fresh agent.** Read this whole doc, then do the work. Everything you
> need to start is here. Shared background: `CTB_RENAME_PROGRESS.md`,
> `CTB_RENAME_PLAN.md`, repo-root `AGENTS.md`. Branch: `ben/ctb-rename-migration-builder`.

## Goal

Prove (and fix if needed) that the auto-generated **rename migrations are
fresh-database-safe on postgres and mysql**, not just sqlite.

A "fresh DB" scenario: a developer accumulates rename migrations against their dev
DB, then deploys to a brand-new empty DB. Migrations run **before** schema-sync, so
the target table/column doesn't exist yet. The generated migration must:

1. **Not crash** startup (the guarded `hasColumn`/`hasTable` check makes it a no-op).
2. Still be **recorded as executed** so it never re-runs after sync creates the
   tables (a re-run would wrongly rename the freshly-created column).

This already works and is tested on **sqlite**. Guards are **driver-sensitive**
(sqlite/pg/mysql/mariadb differ in DDL, transactional DDL, and error semantics), so
pg + mysql must be verified explicitly.

## Why it matters

This is the riskiest remaining gap. If a guard behaves differently on pg/mysql, a
production first-deploy could crash on boot or silently lose data. It blocks
shipping the feature with confidence.

## Where to begin

The existing, passing sqlite proof is your template:

- `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts`
  — real sqlite `Database`, writes a guarded migration file, runs
  `createUserMigrationProvider(db)`, asserts no-op-recorded / no-double-rename /
  data-preserving-rename / swap. **Read this first** — you are extending its
  coverage to pg + mysql.

The guarded snippet shapes it tests mirror what the builder emits:
`packages/core/database/src/migrations/file-builder.ts` (`RENAME_COLUMN_SNIPPET`,
`RENAME_TABLE_SNIPPET`, `UPDATE_ROWS_SNIPPET`).

Migration runner internals (if you need to dig): `migrations/users.ts` (Umzug,
globs `*.{js,sql}`), `migrations/storage.ts` (`strapi_migrations` tracking),
`migrations/index.ts` (provider order `[user, internal]`).

## Suggested approach

You have two complementary options — do **both** if time allows, but the API-level
run (option 2) is the must-have:

### 1. Driver-parameterized unit test (fast feedback)

Generalize `fresh-db-rename.test.ts` to also run against pg + mysql when those DBs
are reachable. Start the test DBs with the repo's compose file:

```bash
docker-compose -f docker-compose.test.yml up -d   # postgres:5432, mysql:8 :3306
# creds (from the compose file): user=strapi pass=strapi db=strapi_test
```

- Factor the sqlite `Database` factory into a per-driver factory (mirror the
  connection blocks in `tests/scripts/run-api-tests.js`: pg uses `schema: 'myschema'`).
- Guard pg/mysql cases so they **skip** (not fail) when the DB isn't reachable, so
  the suite still passes in environments without docker. Keep sqlite always-on.
- Assert the same four behaviours per driver: no-op recorded on empty DB; no
  re-run; data-preserving rename; swap preserves both values. Add a `renameTable`
  case and an `updateRows` (`component_type` / link-table `field`) case too, since
  those guards (`hasTable`, `update`) also differ per driver.

### 2. API integration run on pg + mysql (the real proof)

The end-to-end suite already exists and passes on sqlite:
`tests/api/core/content-type-builder/rename-migration.test.api.js`.

Run it against the other drivers:

```bash
docker-compose -f docker-compose.test.yml up -d
yarn test:api rename-migration --db=postgres
yarn test:api rename-migration --db=mysql
```

For the **true fresh-DB ordering** scenario (generate in DB A, boot against empty
DB B), add a test that, after generating a rename migration, drops/recreates the
schema (or points at a second empty DB) and asserts the app boots, the migration is
recorded in `strapi_migrations`, and sync produces the correct final schema. Model
the DB lifecycle on how `rename-migration.test.api.js` already calls `restart()`.

## How to test

```bash
# unit (driver-parameterized)
yarn jest packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts

# end-to-end on each driver
docker-compose -f docker-compose.test.yml up -d
yarn test:api rename-migration --db=postgres
yarn test:api rename-migration --db=mysql
```

Then the standard gates: `yarn test:ts && yarn lint && yarn prettier:check`.

## Acceptance criteria

- [ ] Fresh-DB guarded rename verified on **postgres** and **mysql** (no boot crash,
      migration recorded as executed, no double-rename after sync).
- [ ] Coverage includes `renameColumn`, `renameTable`, and `updateRows` guards (all
      three primitives the builder emits).
- [ ] `rename-migration.test.api.js` passes on `--db=postgres` and `--db=mysql`.
- [ ] pg/mysql unit cases **skip cleanly** when the DBs aren't reachable (don't break
      sqlite-only / CI-without-docker runs).
- [ ] If any driver needed a different guard/approach, document the per-driver
      fallback in `CTB_RENAME_PLAN.md` ("The hard part: fresh-database / ordering").

## Out of scope

- mariadb (note it as a follow-up if you don't get to it).
- Changing the migration output shape unless a driver genuinely requires it (if so,
  keep sqlite working and document why).

## When done

Mark Step A ✅ in `CTB_RENAME_STEPS/README.md` and update the matching row in
`CTB_RENAME_PROGRESS.md` (TL;DR table + "Missing / TODO" item A).
