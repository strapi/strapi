# Migration integration tests

End-to-end checks for **Strapi v4 (or pinned v5) seed → optional published Strapi `via` steps → always workspace** (this monorepo's `examples/complex`).

The framework is **Docker-native**: the v4 baseline and pinned-v5 stages run inside a Node-20 runner container so the test is decoupled from the host's Node version. The host only runs the orchestrator + the final workspace validation step (which uses the locally-built workspace `@strapi/strapi`).

## Requirements

- **Docker Engine 20+** with **Compose v2** (`docker compose ...`). Docker Desktop on macOS / Windows works out of the box.
- A locally-built workspace (`yarn build`) — the workspace validation stage runs on the host with the workspace `@strapi/strapi`.
- **`--initial <semver>`** — explicit starting npm version (**required** unless you pass **`--scenario`**). Final app is **always workspace**; there is no `--final` Strapi version.
- **`--via` / `-v`** — optional repeatable pinned Strapi versions between seed and workspace.

Hands-on commands and `yarn test:migrations` flags: [examples/complex/README.md — Automated migration test](../../examples/complex/README.md). CI triggers and path filters are documented **below** (not repeated in the complex README).

## Quick reference

```bash
# Default local flow (pick any 4.x you want to test)
yarn test:migrations --initial 4.26.0 --database sqlite

# v4 → pinned 5.30.0 → workspace (full ladder)
yarn test:migrations --initial 4.26.0 --via 5.30.0 --database postgres

# Resolve plan only (seconds; no installs, no Docker)
yarn test:migrations:plan --initial 4.26.0
```

JSON scenarios live in [`scenarios/`](scenarios/). Optional checkpoints: [`CHECKPOINTS.md`](CHECKPOINTS.md).

## What runs where

| Stage           | Where it runs              | Why                                                                                 |
| --------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| `v4-scaffold`   | Runner container (Node 20) | Strapi v4 only supports Node ≤ 20; the runner image pins it.                        |
| `v5-pinned`     | Runner container (Node 20) | Pinned npm Strapi versions stay reproducible regardless of the host's Node version. |
| `strapi-pinned` | Runner container (Node 20) | Boots the pinned release once to apply its internal migrations, then exits.         |
| `workspace`     | Host                       | Uses the locally-built workspace `@strapi/strapi`; engines: Node 20–24.             |

DBs (`postgres`, `mysql`, `mariadb`) run as compose services and are reachable as `postgres` / `mysql` / `mariadb` from the runner. They are also published to the host on `localhost:15432` / `13306` / `13307` (override with `POSTGRES_HOST_PORT` / `MYSQL_HOST_PORT` / `MARIADB_HOST_PORT`) so the workspace stage can reach the same database. `sqlite` uses a single bind-mounted file at `examples/complex/.migration-v5/migration.sqlite`.

## Layout

```
tests/migration/
├── docker/
│   ├── Dockerfile.runner         # Node 20 + build deps for native compile
│   └── docker-compose.yml        # postgres / mysql / mariadb / runner
├── skeleton/
│   ├── v4/                       # static Strapi v4 app skeleton (config/, src/, .env.tmpl, package.tmpl.json)
│   └── v5-pinned/                # package + env templates; everything else is copied from examples/complex
├── scenarios/                    # JSON migration scenarios (id + baseline + stages)
├── scenario-schema.json
└── scripts/
    └── run.js                    # the orchestrator (entry point for `yarn test:migrations`)
```

The orchestrator hydrates a disposable app per stage under `examples/complex/.migration-v5/<stage-id>/`. Apps are wiped at the start of each run; the yarn cache + runner home directories survive (so warm runs are fast).

## CI (GitHub Actions)

Job **`migration_v5`** in [`.github/workflows/tests.yml`](../../.github/workflows/tests.yml) runs **`yarn test:migrations --initial "$VERSION" --database <matrix>`** on a matrix over **sqlite**, **postgres**, **mysql**, and **mariadb** (host Node **20**; the runner container always uses Node 20 regardless). **`$VERSION`** is the latest Strapi v4 from npm: `npm view @strapi/strapi@legacy version`. The step uses **`timeout 25m`**.

### When `migration_v5` runs

Job **`migration_v5`** runs when the **`migrations`** path filter matches the PR/push diff. Exact globs are defined only in [`.github/filters.yaml`](../../.github/filters.yaml) (that file's other groups, e.g. **`global:`**, are independent).

Optional follow-up: **v5-only baseline** or extra **`--via`** matrix legs are not in CI yet.

## Implementation

- Orchestrator: [`scripts/run.js`](scripts/run.js)
- Runner image: [`docker/Dockerfile.runner`](docker/Dockerfile.runner)
- Compose stack: [`docker/docker-compose.yml`](docker/docker-compose.yml)
- Skeletons: [`skeleton/v4/`](skeleton/v4/), [`skeleton/v5-pinned/`](skeleton/v5-pinned/)
- Workspace validators: [`examples/complex/scripts/validate-migration.js`](../../examples/complex/scripts/validate-migration.js) — driven by the orchestrator with `MIGRATION_DATA_ORIGIN` / `MIGRATION_SKIP_DP_JOIN_PARITY` env vars (validators `full`, `full-v4-origin`, `full-v5-origin`, `full-ladder`).
