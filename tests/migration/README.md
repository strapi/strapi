# Migration integration tests

End-to-end **v4 seed → workspace** checks on the monorepo migration test fixture at [`examples/complex`](../../examples/complex/README.md).

## Test fixture

The **Strapi app, schemas, seeds, validators, and DB tooling** live in [`examples/complex/`](../../examples/complex/README.md) (workspace name `complex`). This directory (`tests/migration/`) owns the **runner and CI wiring** only.

The fixture path is historical; we may relocate it under `tests/migration/` later. Until then, CI watches both trees — see [When `migration_v5` runs](#when-migration_v5-runs) and [`.github/filters.yaml`](../../.github/filters.yaml).

## Requirements

- **`--initial <version>`** — starting Strapi npm version (**required** unless you pass **`--scenario`**). Use **`legacy`** for the latest v4 line (`@strapi/strapi@legacy`), or an explicit semver (e.g. `4.26.2`). Final app is **always workspace** (this monorepo).
- Optional **`--scenario`** — load [`scenarios/v4-to-head.json`](scenarios/v4-to-head.json) instead of CLI flags.

Hands-on commands: [examples/complex/README.md — Automated migration test](../../examples/complex/README.md). CI triggers and path filters are documented **below**.

## Quick reference

```bash
# Fast local smoke (~1–2 min when dist is warm)
yarn test:migrations:smoke

# Plan only (seconds; no installs; `legacy` needs npm)
yarn test:migrations:plan --initial legacy

# Full local run (sqlite default; add --skip-build when already built)
yarn test:migrations --initial legacy --database sqlite --skip-build

# Same as CI path (named scenario)
yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json
```

Optional checkpoints: [`CHECKPOINTS.md`](CHECKPOINTS.md).

## CI (GitHub Actions)

Job **`migration_v5`** in [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml) runs:

```bash
yarn test:migrations --initial legacy --initial-node 20 --database <matrix> --skip-build
```

on **sqlite**, **postgres**, **mysql**, and **mariadb** (Node **20**). **`legacy`** resolves to the latest Strapi v4 from npm (`@strapi/strapi@legacy`). The step uses **`timeout 25m`**.

### CI parity (local vs GitHub)

- Nested `yarn install` in ephemeral apps (`.migration-v5/`) uses an empty **`yarn.lock`** (standalone project marker) plus **`YARN_ENABLE_IMMUTABLE_INSTALLS=false`** so PR hardened mode does not fail with `YN0028` when the lockfile is populated.
- CI also sets **`YARN_ENABLE_IMMUTABLE_INSTALLS: false`** on the job and passes **`--initial-node 20`** to match the runner.
- **Postgres / MySQL / MariaDB** matrix legs start DB containers via `examples/complex/docker-compose.dev.yml`. CI sets **`STRAPI_BENCH_RUNTIME=docker`** (and `compose.js` prefers Docker when **`GITHUB_ACTIONS=true`**) because Podman is often installed on runners but not running.
- If CI fails on nested install but local passes, compare Node major and re-run with `--initial-node 20`.

### When `migration_v5` runs

Job **`migration_v5`** runs when the **`migrations`** path filter matches the PR/push diff. Exact globs are defined only in [`.github/filters.yaml`](../../.github/filters.yaml) (that file’s other groups, e.g. **`global:`**, are independent).

## Implementation

- Runner: [`scripts/run-migration-scenario.js`](scripts/run-migration-scenario.js)
- Version aliases: [`framework/resolve-strapi-version.js`](framework/resolve-strapi-version.js)
- Fixture spec + validators: [`fixture/`](fixture/)
- Canonical scenario: [`scenarios/v4-to-head.json`](scenarios/v4-to-head.json)
