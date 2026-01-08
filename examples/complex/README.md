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
   yarn clone:v4
   ```

   This creates a Strapi v4 project at `examples/complex/v4` (inside the monorepo) with all the same schemas.

2. **Navigate to the v4 project:**

   ```bash
   cd examples/complex/v4
   ```

3. **Configure the v4 project:**

   ```bash
   cp .env.example .env
   # Edit .env to set your database configuration
   ```

4. **Start the v4 project:**
   ```bash
   npm run develop
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

### Typical Migration Testing Workflow

1. **Setup v4 project** (if not already done):

   ```bash
   yarn clone:v4
   ```

2. **Start v4 project** (in separate terminal, use the path printed by setup):

   ```bash
   cd <path-printed-by-setup>
   npm run develop
   ```

   (v4 will automatically start its database if needed)

3. **Create test data** in the v4 admin panel (manual step)

4. **Create snapshot:**

   ```bash
   cd examples/complex
   yarn db:snapshot:postgres mybackup
   ```

5. **Stop v4 server** (Ctrl+C in v4 terminal)

6. **Start v5 server** with the same database:

   ```bash
   yarn develop:postgres
   ```

   Migrations will run automatically on startup.

7. **Test and fix bugs** as needed

8. **Restore snapshot** to reset database:

   ```bash
   yarn db:restore:postgres mybackup
   ```

9. **Repeat from step 6** to test fixes

**Note:** The database container stays running even after stopping Strapi, so you can inspect the database or run multiple tests without restarting the container.

### Snapshots

Database snapshots are stored in the `snapshots/` directory:

- PostgreSQL: `snapshots/postgres-<name>.sql`
- MySQL: `snapshots/mysql-<name>.sql`

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

These commands will:

- ✅ Automatically start the database container if it's not already running
- ✅ Configure Strapi to use the specified database (no manual config needed)
- ✅ Start the Strapi development server
- ✅ Keep the database container running when you press Ctrl+C (only Strapi stops)

**Note:** The database containers use the standard ports:

- PostgreSQL: port `5432`
- MySQL: port `3306`

### Standard Strapi Commands

- `yarn develop` - Start development server (defaults to PostgreSQL; requires a running DB)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn strapi` - Run Strapi CLI commands

## Use Node 20 (recommended)

This repository and the `examples/complex` migration tooling are tested with Node.js 20. If you encounter native module errors, switch to Node 20 and reinstall dependencies before running the migration flow.

On macOS using `nvm` (example commands):

```bash
# select Node 20
nvm use 20

# from the monorepo root: reinstall dependencies (rebuilds native modules)
cd /Users/basselkanso/Desktop/strapi_2
yarn install --network-timeout 600000

# also rebuild/install in the generated v4 project (if present)
cd examples/complex/v4 || true
yarn install --network-timeout 600000

# Alternatively, rebuild native modules:
npm rebuild
```

After rebuilding native modules, rerun the migration test flow (for example `yarn test:migration`).
