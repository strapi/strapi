# Complex Example Project

This project contains complex Strapi schemas for testing migrations between Strapi v4 and v5.

## Content Types

The project includes 6 content types with different combinations of features:

- `basic` - Basic content type (no draft/publish, no i18n)
- `basic-dp` - Basic content type with draft/publish
- `basic-dp-i18n` - Basic content type with draft/publish and i18n
- `relation` - Relation content type (no draft/publish, no i18n)
- `relation-dp` - Relation content type with draft/publish
- `relation-dp-i18n` - Relation content type with draft/publish and i18n

## Migration Testing Workflow

This project includes tools for testing migrations between Strapi v4 and v5 by creating an isolated v4 project and managing database snapshots. The complex example ships its own `docker-compose.dev.yml` so the database containers are independent of the monorepo root.

### Setup

1. **Create/Update the external v4 project:**

   ```bash
   yarn setup:v4
   ```

   This creates a Strapi v4 project outside the monorepo (default: a sibling directory named `complex-v4`). You can override the location via `V4_OUTSIDE_DIR`.

2. **Navigate to the v4 project** (use the path printed by setup):

   ```bash
   cd <path-printed-by-setup>
   ```

3. **Configure the v4 project** (only if you need custom DB creds):

   ```bash
   cp .env.example .env
   # Edit .env as needed
   ```

4. **Start the v4 project:**
   ```bash
   yarn develop:postgres
   ```

### Database Management

#### PostgreSQL

**Start PostgreSQL container:**

```bash
yarn db:start:postgres
```

**Stop PostgreSQL container:**

```bash
yarn db:stop:postgres
```

**Create a snapshot:**

```bash
yarn db:snapshot:postgres <name>
```

Example: `yarn db:snapshot:postgres mybackup`

**Restore from snapshot:**

```bash
yarn db:restore:postgres <name>
```

Example: `yarn db:restore:postgres mybackup`

**Wipe database (drop and recreate):**

```bash
yarn db:wipe:postgres
```

**Check database (show table row counts):**

```bash
yarn db:check:postgres
```

This displays a table showing how many records are in each table, useful for quickly seeing if the database is empty, has data, etc.

#### MySQL

**Start MySQL container:**

```bash
yarn db:start:mysql
```

**Stop MySQL container:**

```bash
yarn db:stop:mysql
```

**Create a snapshot:**

```bash
yarn db:snapshot:mysql <name>
```

Example: `yarn db:snapshot:mysql mybackup`

**Restore from snapshot:**

```bash
yarn db:restore:mysql <name>
```

Example: `yarn db:restore:mysql mybackup`

**Wipe database (drop and recreate):**

```bash
yarn db:wipe:mysql
```

**Check database (show table row counts):**

```bash
yarn db:check:mysql
```

This displays a table showing how many records are in each table, useful for quickly seeing if the database is empty, has data, etc.

#### MariaDB (MySQL-compatible; Strapi uses `DATABASE_CLIENT=mysql`)

Same UX as MySQL; Compose maps host **`MARIADB_PORT` → container 3306** (default host port **3307** so it can run beside MySQL on **3306**).

```bash
yarn db:start:mariadb
yarn db:stop:mariadb
yarn db:snapshot:mariadb <name>
yarn db:restore:mariadb <name>
yarn db:wipe:mariadb
yarn db:check:mariadb
```

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

   This includes a **document_id backfill** check (internal migration `5.0.0-02-created-document-id`): every table with a `documentId` attribute, including upload **`files`**, must have no `NULL` `document_id` after migrations. The v4 seed always creates media files so the `files` table is populated before the v4→v5 upgrade.

9. **Test and fix bugs** as needed

10. **Restore snapshot** to reset database:

```bash
yarn db:restore:postgres mybackup
```

11. **Repeat from step 7** to test fixes

**Note:** The database container stays running even after stopping Strapi, so you can inspect the database or run multiple tests without restarting the container. The complex example uses its own Compose project name (`strapi_complex`) so it does not collide with other containers.

### Automated migration test (monorepo)

From the **repository root**, after a full `yarn build`:

```bash
yarn test:migrations --initial 4.26.0
```

You must pass **`--initial <semver>`** (unless you use **`--scenario`**): that is the **only** explicit Strapi/npm version you choose for the baseline (v4 or v5). **Optional `--via`** adds intermediate published Strapi boots. The **last step is always workspace** — the current monorepo (`examples/complex` + workspace packages). There is **no** final Strapi version flag.

This wipes isolated state under `examples/complex/.migration-v5/`, scaffolds the baseline app, seeds it, optionally runs `--via` pinned releases, then validates against **workspace** on the same database. **`--initial` 4.x** = v4 scaffold + `scripts/seed.js`; **`--initial` 5.x** = pinned v5 + `scripts/seed-v5.js`. Uses Compose project `strapi_migration_v5` by default. A typical run with `sqlite` and `--skip-build` is often **about 1–4 minutes**. **Instant dry-run:** `yarn test:migrations:plan --initial 4.26.0` (or `--print-plan`).

**CI, path filters, matrix:** see [`tests/migration/README.md`](../../tests/migration/README.md) (`migration_v5` job).

Options:

- `--initial <semver>` — **Required** when not using `--scenario`. Explicit starting npm version: **4.x** = v4 scaffold; **5.x** (e.g. `5.7.0`) = pinned v5 + v5 seed. **Final Strapi is always workspace** (not configurable).
- `--via <semver>` / `-v` — repeatable; extra Strapi version(s) to boot **after** the baseline seed, before workspace (e.g. `5.30.0` after a v4 baseline, or a newer 5.x after a v5-only baseline). With any `--via`, validation defaults to `full-ladder`. With a **5.x** baseline and **no** `--via`, it defaults to `full-v5-origin` (v5 data expectations; see `tests/migration/framework/validators.js`). With a **4.x** baseline and no `--via`, it defaults to `full-v4-origin` (aliased as `full`).
- `--scenario <path>` — JSON scenario file (overrides `--initial` / `--via` / `--validators`).
- `--validators` — comma-separated list (e.g. `full-v4-origin`, `full-v5-origin`, `full-ladder`); see [`tests/migration/framework/validators.js`](../../tests/migration/framework/validators.js).
- `--initial-node` / `--workspace-node` (alias `--final-node`) — optional Node major checks for the baseline phase vs the **workspace** validation phase only (not a Strapi version).
- `--database postgres` (default) | `mysql` | `mariadb` (MySQL protocol; `DATABASE_CLIENT=mysql` against the MariaDB service) | `sqlite`
- `--multiplier N` — scale seed and validation expectations
- `--build` — run `yarn build` first; omit if you already built

Optional env: [`tests/migration/v5/.env.example`](../../tests/migration/v5/.env.example) → `tests/migration/v5/.env` (ports, compose project, seed scale; migration harness picks free ports when unset).

Strapi v4 in the scaffold targets **Node ≤ 20**; use Node 20 if install or seed fails on newer Node.

Use `yarn test:migrations --initial 4.26.0 --database sqlite` (pass flags after the script name; avoid an extra `--` before `--database` or Yarn may not forward options correctly).

CLI examples:

- `yarn test:migrations --initial 4.26.0 --via 5.30.0 --database sqlite` — v4 seed, boot Strapi `5.30.0`, then workspace (see `tests/migration/scenarios/v4-via-5-30-0-to-head.json`).
- `yarn test:migrations --initial 5.7.0 --database sqlite` — v5-only path: `5.7.0` + `seed-v5.js`, then workspace (see `tests/migration/scenarios/v5-5-7-to-workspace.json`).
- `yarn test:migrations --initial-node 20` — fail fast if the current Node major is not 20 (useful for the v4 scaffold).
- `yarn test:migrations --scenario tests/migration/scenarios/v4-to-head.json` — JSON scenario.

Optional: local DB checkpoint tips in [`tests/migration/CHECKPOINTS.md`](../../tests/migration/CHECKPOINTS.md).

### Snapshots

Database snapshots are stored in the `snapshots/` directory:

- PostgreSQL: `snapshots/postgres-<name>.sql`
- MySQL: `snapshots/mysql-<name>.sql`
- MariaDB: `snapshots/mariadb-<name>.sql`

Snapshots are gitignored and should not be committed to the repository.

## Development Commands

### Simplified Database Commands

The easiest way to start Strapi with a specific database:

**Start with PostgreSQL:**

```bash
yarn develop:postgres
```

**Start with MySQL:**

```bash
yarn develop:mysql
```

**Start with MariaDB:**

```bash
yarn develop:mariadb
```

These commands will:

- ✅ Automatically start the database container if it's not already running
- ✅ Configure Strapi to use the specified database (no manual config needed)
- ✅ Start the Strapi development server
- ✅ Keep the database container running when you press Ctrl+C (only Strapi stops)

**Note:** The database containers use the standard ports by default and can be overridden:

- PostgreSQL: port `5432` (override with `POSTGRES_PORT`)
- MySQL: port `3306` (override with `MYSQL_PORT`)
- MariaDB: host port `3307` by default (override with `MARIADB_PORT`; maps to container `3306`)

### Standard Strapi Commands

- `yarn develop` - Start development server (defaults to PostgreSQL; requires a running DB)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn strapi` - Run Strapi CLI commands

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
