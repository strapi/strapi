# Migration integration tests

End-to-end checks for **v4 (or pinned v5) seed → optional published Strapi `via` steps → always workspace** (this monorepo’s `examples/complex`).

## Requirements

- **`--initial <semver>`** — explicit starting npm version (**required** unless you pass **`--scenario`**). Final app is **always workspace**; there is no `--final` Strapi version.
- **`--via` / `-v`** — optional repeatable pinned Strapi versions between seed and workspace.

Hands-on commands and `yarn test:migrations` flags: [examples/complex/README.md — Automated migration test](../../examples/complex/README.md). CI triggers and path filters are documented **below** (not repeated in the complex README).

## Quick reference

```bash
# Default local flow (pick any 4.x you want to test)
yarn test:migrations --initial 4.26.0 --database sqlite --skip-build

# Resolve plan only (seconds; no installs)
yarn test:migrations:plan --initial 4.26.0
```

JSON scenarios live in [`scenarios/`](scenarios/). Optional checkpoints: [`CHECKPOINTS.md`](CHECKPOINTS.md).

## CI (GitHub Actions)

Job **`migration_v5`** in [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml) runs **`yarn test:migrations --initial "$VERSION" --database <matrix> --skip-build`** on a matrix over **sqlite**, **postgres**, **mysql**, and **mariadb** (Node **20**). **`$VERSION`** is the latest Strapi v4 from npm: `npm view @strapi/strapi@legacy version`. The step uses **`timeout 25m`**.

### When `migration_v5` runs

Job **`migration_v5`** runs when the **`migrations`** path filter matches the PR/push diff. Exact globs are defined only in [`.github/filters.yaml`](../../.github/filters.yaml) (that file’s other groups, e.g. **`global:`**, are independent).

Optional follow-up: **v5-only baseline** or extra **`--via`** matrix legs are not in CI yet.

## Implementation

- Runner: [`scripts/run-migration-scenario.js`](scripts/run-migration-scenario.js)
- Validators: [`framework/validators.js`](framework/validators.js)
