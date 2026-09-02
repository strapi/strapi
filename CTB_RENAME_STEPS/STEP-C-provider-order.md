# Step C — Verify provider order `[user, internal]` is fresh-DB safe

> ✅ Done 2026-06-12. Implemented in
> `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts` and
> verified with
> `yarn test:unit packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts --runInBand`.

> **You are a fresh agent.** Read this whole doc, then do the work. Everything you
> need to start is here. Shared background: `CTB_RENAME_PROGRESS.md`,
> `CTB_RENAME_PLAN.md`, repo-root `AGENTS.md`. Branch: `ben/ctb-rename-migration-builder`.

## Goal

Confirm that the migration **provider order** — user migrations run **before**
internal migrations (`[userProvider, internalProvider]`) — does not interact badly
with our guarded rename no-ops on a fresh database. If it does, document or fix it.

## Why it matters

The plan flags this as an assumption, not a verified fact:

> Provider order `[user, internal]` vs old internal-first — guarded no-ops assumed
> safe; not explicitly tested against internal migrations.

Our generated rename migrations are **user** migrations, so on a fresh DB they run
first — before internal migrations and before schema-sync. We need to be sure a
guarded rename no-op that runs _ahead_ of an internal migration (e.g. the
identifier-shortening migration) can't leave the DB in a state that breaks the
internal one, or vice-versa.

## Where to begin

- **Provider order definition:** `packages/core/database/src/migrations/index.ts`
  — confirm the order is `[userProvider, internalProvider]` and how `up()` chains
  them.
- **Runner + tracking:** `migrations/users.ts`, `migrations/storage.ts`
  (`strapi_migrations` vs `strapi_migrations_internal`).
- **An internal migration that does renames** (good adversarial case):
  `packages/core/database/src/migrations/internal-migrations/5.0.0-01-convert-identifiers-long-than-max-length.ts`
  (uses `renameColumn`/`renameTable`).
- **Fresh-DB test template:**
  `packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts`
  (real sqlite, runs `createUserMigrationProvider`). Extend the pattern to also
  exercise an internal migration in the same boot.

## Suggested approach

1. Read `migrations/index.ts` and confirm the exact order and chaining. Write down
   the finding (even "confirmed safe by inspection" is a deliverable).
2. Add a test that, on a **fresh** sqlite DB, runs a guarded user rename migration
   **and** an internal migration in the real order, then asserts:
   - boot/`up()` does not throw,
   - both providers' tracking tables record their migrations as executed,
   - re-running `up()` is a no-op (nothing re-runs, nothing double-applies).
3. If you can reach pg/mysql (see `docker-compose.test.yml`), spot-check there too —
   but sqlite coverage + an inspection write-up is the minimum.

## How to test

```bash
yarn jest packages/core/database/src/migrations/__tests__/fresh-db-rename.test.ts
yarn test:unit   # broader migration-runner regression
yarn test:ts && yarn lint && yarn prettier:check
```

## Acceptance criteria

- [x] Provider order is confirmed in `migrations/index.ts` and the finding is
      written into `CTB_RENAME_PLAN.md` (replace the ⬜ "Provider order" build-decision
      bullet with the verified result).
- [x] A fresh-DB test exercises a user rename migration **alongside** an internal
      migration in the real order, asserting no throw, correct tracking, and no
      re-run.
- [x] If any unsafe interaction is found, it's fixed or explicitly documented with a
      mitigation.

## Out of scope

- Reordering providers (don't change the order — only verify/guard).
- Rewriting internal migrations.

## When done

Mark Step C ✅ in `CTB_RENAME_STEPS/README.md` and update the matching row in
`CTB_RENAME_PROGRESS.md` (and flip the related build-decision bullet in
`CTB_RENAME_PLAN.md`).
