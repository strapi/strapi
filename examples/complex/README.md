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

**Note:** The database containers use the standard ports by default and can be overridden:

- PostgreSQL: port `5432` (override with `POSTGRES_PORT`)
- MySQL: port `3306` (override with `MYSQL_PORT`)

### Standard Strapi Commands

- `yarn develop` - Start development server (defaults to PostgreSQL; requires a running DB)
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn strapi` - Run Strapi CLI commands
