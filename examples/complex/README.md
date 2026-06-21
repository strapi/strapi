# Complex Example Project

This project contains complex Strapi schemas for testing migrations between Strapi v4 and v5, plus a benchmark harness for measuring the performance of those migrations.

## Content Types

The project includes 8 content types covering the feature space v4→v5 migrations touch.

### Baseline feature combinations

- `basic` — no draft/publish, no i18n
- `basic-dp` — draft/publish
- `basic-dp-i18n` — draft/publish + i18n
- `relation` — relations + morphs + components + DZ
- `relation-dp` — + draft/publish
- `relation-dp-i18n` — + i18n

### Anti-pattern stress schemas

Intentionally unrealistic; each targets a specific migration code path.

- `hc-m2m-source` / `hc-m2m-target` — high-cardinality many-to-many. At `--multiplier 100` produces ~2K sources × ~2K targets × 10 fanout = 20K+ join rows, crossing the 1000-row chunk boundary in `copyRelationTableRows`.

## Supported databases

- **PostgreSQL 16** — via podman/docker container on `${POSTGRES_PORT:-5432}`
- **MySQL 8** — via container on `${MYSQL_PORT:-3306}`
- **MariaDB 11** — via container on `${MARIADB_PORT:-3307}`
- **SQLite** — file-based at `../complex-v4/.tmp/data.db` (override with `SQLITE_DATABASE_FILENAME`)

Container runtime is auto-detected in this order: `podman compose` → `podman-compose` → `docker compose` → `docker-compose`. Override with `STRAPI_BENCH_RUNTIME=podman|docker` on mixed-install hosts.

## Migration Testing Workflow

This project includes tools for testing migrations between Strapi v4 and v5 by creating an isolated v4 project and managing database snapshots. The complex example ships its own `docker-compose.dev.yml` so the database containers are independent of the monorepo root.

### Setup

1. **Create/Update the external v4 project:**

   ```bash
   yarn setup:v4
   ```

   This creates a Strapi v4 project outside the monorepo (default: a sibling directory named `complex-v4`). You can override the location via `V4_OUTSIDE_DIR`.

2. **Install v4 deps** (one-time):

   ```bash
   cd <path-printed-by-setup>
   yarn install
   ```

3. **Configure the v4 project** (only if you need custom DB creds):

   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

4. **Start the v4 project:**

   ```bash
   yarn develop:postgres    # or :mysql, :mariadb, :sqlite
   ```

### Database Management

The same per-command pattern applies to `postgres`, `mysql`, `mariadb`, and `sqlite`:

```bash
yarn db:start:<db>                 # start the DB container (no-op for sqlite)
yarn db:stop:<db>                  # stop the DB container (no-op for sqlite)
yarn db:snapshot:<db> <name>       # snapshot current DB state
yarn db:restore:<db> <name>        # restore DB from a named snapshot
yarn db:wipe:<db>                  # drop + recreate (clean slate)
yarn db:check:<db>                 # print table row counts (runs ANALYZE first for fresh stats)
```

Snapshots live in `snapshots/` and are gitignored:

- PostgreSQL: `snapshots/postgres-<name>.sql`
- MySQL: `snapshots/mysql-<name>.sql`
- MariaDB: `snapshots/mariadb-<name>.sql`
- SQLite: `snapshots/sqlite-<name>.db` (raw file copy; fast)

### Typical Migration Testing Workflow

1. **Setup v4 project** (if not already done):

   ```bash
   yarn setup:v4
   ```

2. **Wipe the database** (ensures v4 format, no v5 schema):

   ```bash
   yarn db:wipe:postgres
   ```

3. **Start v4 project** (in separate terminal, use the path printed by setup):

   ```bash
   cd <path-printed-by-setup>
   yarn develop:postgres
   ```

   (v4 will automatically start its database if needed)

4. **Seed test data** in the v4 project:

   ```bash
   yarn seed
   ```

5. **Create snapshot:**

   ```bash
   cd examples/complex
   yarn db:snapshot:postgres mybackup
   ```

6. **Stop v4 server** (Ctrl+C in v4 terminal)

7. **Start v5 server** with the same database:

   ```bash
   yarn develop:postgres
   ```

   Migrations will run automatically on startup.

8. **Validate migration** (no HTTP server needed):

   ```bash
   yarn test:migration
   ```

9. **Test and fix bugs** as needed

10. **Restore snapshot** to reset database:

    ```bash
    yarn db:restore:postgres mybackup
    ```

11. **Repeat from step 7** to test fixes

**Note:** The database container stays running even after stopping Strapi, so you can inspect the database or run multiple tests without restarting the container. The complex example uses its own Compose project name (`strapi_complex`) so it does not collide with other containers.

## Migration performance benchmark

For reviewing PRs that touch v4→v5 migration code, this project ships a benchmark harness that captures per-migration timings and produces baseline-vs-candidate reports across any combination of databases and multipliers.

### Quick start

```bash
# One-time setup
yarn setup:v4
cd ../../complex-v4 && yarn install && cd -

# Seed data (one snapshot per DB × multiplier, kept in snapshots/)
yarn bench:seed --db postgres --multiplier 100

# Capture baseline — on develop (or whatever you're comparing against)
yarn bench:run --db postgres --multiplier 100 --label baseline

# Capture candidate — git checkout or cherry-pick the PR, rebuild, then:
yarn workspace @strapi/database run build
yarn workspace @strapi/core run build
yarn bench:run --db postgres --multiplier 100 --label pr-xxxxx

# Generate matrix comparison report
yarn bench:compare --baseline baseline --candidate pr-xxxxx
```

Reports land in `results/`:

- `compare-<timestamp>.md` — clipboard-ready markdown, also echoed to stdout
- `compare-<timestamp>.html` — self-contained single-file HTML with inline SVG charts, sortable tables, and light/dark theme support via `prefers-color-scheme`

### Bench subcommands

- **`yarn bench:seed --db <db> --multiplier <n>`** — wipe + boot v4 + seed + snapshot. One-time per (db, multiplier). Runtime scales with multiplier; at `m=100` expect ~8–10 min per DB depending on hardware.
- **`yarn bench:run --db <db> --multiplier <n> --label <label>`** — restore snapshot + spawn Strapi v5 in migrate-then-exit mode + capture per-migration timings via a Node `--require` preload that subscribes to Umzug's native `migrating`/`migrated` events. Emits a result JSON to `results/<db>-<label>-<timestamp>.json`. Typically ~15s to several minutes depending on dataset size.
- **`yarn bench:compare --baseline <label> --candidate <label>`** — render a multiplier × database matrix plus per-cell per-migration breakdowns, to both markdown and self-contained HTML. Accepts partial data (missing cells render as `—`).
- **`yarn bench:suite --multiplier <n> [--dbs postgres,mysql,mariadb,sqlite]`** — chained `bench:run` across DBs for a given multiplier. Runs under whatever Strapi version is currently checked out; label via `--label`.

### Workflow for reviewing a migration-perf PR

1. On `develop`, seed once per (db, multiplier) you want data for.
2. Run baselines: `yarn bench:run --db <db> --multiplier <n> --label baseline`.
3. Cherry-pick the PR's commits (or `gh pr checkout`), rebuild `@strapi/database` and `@strapi/core`.
4. Run candidates with the same `(db, multiplier)` combinations, `--label pr-xxxxx`.
5. Reset cherry-pick + rebuild.
6. `yarn bench:compare --baseline baseline --candidate pr-xxxxx` — paste the markdown into a PR comment; attach the zipped HTML as an upload (GitHub comments don't render `.html` directly).

Snapshots are reused across `bench:run` invocations — you only re-seed when the schema itself changes.

### Benchmark-specific env vars

- `STRAPI_BENCH_HOOK_OUTPUT=<path>` — enables the timing preload (set automatically by `bench.js`, exposed for debugging). The hook self-disables when this isn't set, so the `--require` can safely live in other dev configs.
- `STRAPI_BENCH_HOOK_DEBUG=1` — verbose preload output (migration attach/record events to stderr).
- `STRAPI_BENCH_RUNTIME=podman|docker` — override the auto-detected container runtime.
- `SEED_CONCURRENCY=<n>` — how many entity-creation tasks run in parallel during `bench:seed` / `seed`. Default `5`, which stays under Strapi v4's default knex pool of `{min: 2, max: 10}`. Tune up only if you've also raised the pool max.

## Development Commands

### Simplified Database Commands

The easiest way to start Strapi with a specific database:

```bash
yarn develop:postgres     # PostgreSQL container + Strapi dev server
yarn develop:mysql        # MySQL container + Strapi dev server
yarn develop:mariadb      # MariaDB container + Strapi dev server
yarn develop:sqlite       # SQLite file (no container) + Strapi dev server
```

These commands:

- ✅ Automatically start the database container if it's not already running (no-op for sqlite)
- ✅ Configure Strapi to use the specified database (no manual config needed)
- ✅ Start the Strapi development server
- ✅ Keep the database container running when you press Ctrl+C (only Strapi stops)

**Note:** Default ports:

- PostgreSQL: `5432` (override with `POSTGRES_PORT`)
- MySQL: `3306` (override with `MYSQL_PORT`)
- MariaDB: `3307` (override with `MARIADB_PORT`)

Set the override env var if you have a local DB already bound to the default port:

```bash
POSTGRES_PORT=5433 yarn develop:postgres
```

### Standard Strapi Commands

- `yarn develop` — Start development server (defaults to PostgreSQL; requires a running DB)
- `yarn build` — Build for production
- `yarn start` — Start production server
- `yarn strapi` — Run Strapi CLI commands

## V5 Seeding (Large Dataset)

Use the v5 seeder in this project to generate a large dataset for homepage perf testing:

```bash
yarn seed:v5
```

You can scale the volume with a multiplier:

```bash
yarn seed:v5 -- --multiplier 20
```

Or:

```bash
SEED_MULTIPLIER=20 yarn seed:v5
```
