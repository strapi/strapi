# CTB Rename — Per-Step Kickoff Docs

This folder has **one self-contained kickoff brief per remaining step** of the CTB
rename-migrations feature. The point: open a **fresh AI agent**, point it at the
**single file** for the step you want done, and it has everything it needs to start
— no other context required.

## How to use

1. Pick the step you want to work on from the table below.
2. Start a fresh chat and say: _"Read `CTB_RENAME_STEPS/<file>` and do it."_
3. That one doc tells the agent the goal, where to begin, how to test, and what
   "done" means. It points back to the shared docs only when needed.

## Steps

| Step | File                                                                       | Status | One-liner                                                                                         |
| ---- | -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| A    | [`STEP-A-fresh-db-pg-mysql.md`](STEP-A-fresh-db-pg-mysql.md)               | ✅     | Verified pg/mysql; MySQL required `hasTable` before `hasColumn`.                                  |
| B    | [`STEP-B-never-mode-contrast-test.md`](STEP-B-never-mode-contrast-test.md) | ✅     | Added API contrast test: `never` mode drops/recreates the field and loses data.                   |
| C    | [`STEP-C-provider-order.md`](STEP-C-provider-order.md)                     | ✅     | Verified `[user, internal]` provider order with a guarded user migration plus internal migration. |
| D    | [`STEP-D-cli-rename-field.md`](STEP-D-cli-rename-field.md)                 | ✅     | `strapi rename:field <uid> <old> <new>` renames the attribute + writes one migration in one step. |

Recommended order: **A → B → C → D** (A is the highest-risk gap; D is optional / out of MVP).
All steps are now complete.

## Shared context (every step depends on these)

- **`CTB_RENAME_PROGRESS.md`** — what's done vs. missing (the live tracker).
- **`CTB_RENAME_PLAN.md`** — full implementation plan + how Strapi works today.
- **`CTB_RENAME_QUESTIONS.md`** — resolved build decisions and their rationale.
- **`AGENTS.md`** (repo root) — monorepo conventions, test commands, quality gates.

Branch: `ben/ctb-rename-migration-builder` (base: `develop`). Linear: CMS-635
(related CG-979, CG-1001). PR: #26622 (draft).

## When a step is finished

Update **two** places so the next fresh agent sees an accurate picture:

1. The step's row in the table above (✅ + a one-line note / commit ref).
2. The matching row in `CTB_RENAME_PROGRESS.md`.
