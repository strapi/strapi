# Migration integration tests

End-to-end checks for **v4 (or pinned v5) seed → optional published Strapi `via` steps → always workspace** on the monorepo’s migration test fixture at [`examples/complex`](../../examples/complex/README.md).

## Test fixture

The **Strapi app, schemas, seeds, validators, and DB tooling** live in [`examples/complex/`](../../examples/complex/README.md) (workspace name `complex`). This directory (`tests/migration/`) owns the **runner, scenarios, and CI wiring** only.

The fixture path is historical; we may relocate it under `tests/migration/` later (e.g. `tests/migration/fixture/`). Until then, CI watches both trees — see [When `migration_v5` runs](#when-migration_v5-runs) and [`.github/filters.yaml`](../../.github/filters.yaml).

## Requirements

- **`--initial <semver>`** — explicit starting npm version (**required** unless you pass **`--scenario`**). Final app is **always workspace**; there is no `--final` Strapi version.
- **`--via` / `-v`** — optional repeatable pinned Strapi versions between seed and workspace.

Hands-on commands and `yarn test:migrations` flags: [examples/complex/README.md — Automated migration test](../../examples/complex/README.md). CI triggers and path filters are documented **below** (not repeated in the fixture README).

## Quick reference

```bash
# Fast local smoke (~1–2 min when dist is warm)
yarn test:migrations:smoke

# Plan only (seconds; no installs)
yarn test:migrations:plan --initial 4.26.0

# Full local run (sqlite default; add --skip-build when already built)
yarn test:migrations --initial 4.26.0 --database sqlite --skip-build
```

JSON scenarios live in [`scenarios/`](scenarios/). Optional checkpoints: [`CHECKPOINTS.md`](CHECKPOINTS.md).

## CI (GitHub Actions)

Job **`migration_v5`** in [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml) runs:

```bash
yarn test:migrations --initial "$VERSION" --initial-node 20 --database <matrix> --skip-build
```

on **sqlite**, **postgres**, **mysql**, and **mariadb** (Node **20**). **`$VERSION`** is the latest Strapi v4 from npm: `npm view @strapi/strapi@legacy version`. The step uses **`timeout 25m`**.

### CI parity (local vs GitHub)

- Nested `yarn install` in ephemeral apps (`.migration-v5/`) uses an empty **`yarn.lock`** (standalone project marker) plus **`YARN_ENABLE_IMMUTABLE_INSTALLS=false`** so PR hardened mode does not fail with `YN0028` when the lockfile is populated.
- CI also sets **`YARN_ENABLE_IMMUTABLE_INSTALLS: false`** on the job and passes **`--initial-node 20`** to match the runner.
- **Postgres / MySQL / MariaDB** matrix legs start DB containers via `examples/complex/docker-compose.dev.yml`. CI sets **`STRAPI_BENCH_RUNTIME=docker`** (and `compose.js` prefers Docker when **`GITHUB_ACTIONS=true`**) because Podman is often installed on runners but not running.
- If CI fails on nested install but local passes, compare Node major and re-run with `--initial-node 20`.

### When `migration_v5` runs

Job **`migration_v5`** runs when the **`migrations`** path filter matches the PR/push diff. Exact globs are defined only in [`.github/filters.yaml`](../../.github/filters.yaml) (that file’s other groups, e.g. **`global:`**, are independent).

Optional follow-up: **v5-only baseline** or extra **`--via`** matrix legs are not in CI yet.

## Implementation

- Runner: [`scripts/run-migration-scenario.js`](scripts/run-migration-scenario.js)
- Validators: [`framework/validators.js`](framework/validators.js)
