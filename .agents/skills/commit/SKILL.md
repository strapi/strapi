---
name: commit
description: Use when creating git commits in the Strapi repo - enforces the type list and subject style from CONTRIBUTING.md "Git Conventions" and .commitlintrc.ts
---

# Strapi Commit Conventions

Source of truth: [CONTRIBUTING.md](../../../CONTRIBUTING.md) ("Git Conventions") and [.commitlintrc.ts](../../../.commitlintrc.ts).

## Format

```
type[(scope)]: subject

body
```

- Type and subject are **lowercase**
- No period at end of subject
- Subject is descriptive — say **what** the commit is about, not **how** the code achieves it (see Subject Rules below)
- Scope is optional; use a package or feature area (e.g., `admin`, `database`, `graphql`, `deps`, `commitlint`)
- Body line length is **not** enforced (the `body-max-line-length` rule is disabled)
- Merge commits like `Merge branch '<x>' into <y>` are ignored by commitlint

## Allowed Types

The full enforced list comes from [.commitlintrc.ts](../../../.commitlintrc.ts):

| Type          | Use for                                                                |
| ------------- | ---------------------------------------------------------------------- |
| `feat`        | A new feature                                                          |
| `fix`         | A bug fix                                                              |
| `enhancement` | Improvement to an existing feature (perf, refactor, UX polish)         |
| `chore`       | Internal cleanup, tooling, refactor with no behavior change, dep bumps |
| `docs`        | Documentation only                                                     |
| `test`        | Adding or updating tests                                               |
| `ci`          | CI/CD pipeline changes                                                 |
| `security`    | Security fixes or hardening (often `security(deps): ...`)              |
| `revert`      | Reverting a previous commit                                            |
| `release`     | Release commits (reserved for release tooling)                         |
| `future`      | Work behind a future flag                                              |

> Note: `CONTRIBUTING.md` shows `doc:` in one example; the enforced type is `docs`. Use `docs`.

Types **not** in the list (and therefore rejected by commitlint): `perf`, `refactor`, `style`, `build`, `improvement`, `wip`.

> Note: `refactor` and `perf` are rejected as **type prefixes**, but the underlying work is still valid — route it through `enhancement` (when it improves the product/feature) or `chore` (when it's internal housekeeping with no product change). See the Decision Guide below.

## Subject Rules (from CONTRIBUTING.md)

The subject summarises **what** the commit is about, not **how** the code achieves it.

- `feat: <what the feature is>`
- `fix: <what the problem is>` — describe the bug, not the fix
- `chore: <what the PR is about>`
- `docs: <what is documented>`

> ⚠️ For `fix` commits, the subject must describe the bug being fixed, not the solution. e.g. `fix: unable to publish documents due to missing permissions` — not `fix: add permission check`.

## Decision Guide

- New user-facing capability? → `feat`
- Existing feature is broken? → `fix` (describe the bug)
- Existing feature, code, UX, or perf gets meaningfully better (including internal swaps that improve operational behaviour)? → `enhancement`
- Repo housekeeping with no product change — deps, tooling, build config, examples cleanup, lint/format-only changes? → `chore` (use `chore(deps): ...` for dep bumps)
- Documentation only? → `docs`
- Tests only? → `test`
- CI/workflow files only? → `ci`
- Security advisory or hardening? → `security`
- Behind a future flag? → `future`

## Examples

From [CONTRIBUTING.md](../../../CONTRIBUTING.md):

```
feat: introduce document service
fix: unable to publish documents due to missing permissions
chore: refactor data-fetching in EditView to use react-query
docs: document service API reference
```

## Tooling

Run the `commit` script (`pnpm commit` / `yarn commit`) to use the interactive commit CLI that helps construct a compliant message.
