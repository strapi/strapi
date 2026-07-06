---
title: Migrations
description: Conceptual guide to migrations in Strapi
tags:
  - database
  - migration
---

Strapi manages schema and data migrations in multiple ways. As much as possible we try to automatically sync the DB schema with the application configuration. However this in not sufficient to manage data migrations or schema migrations that are not reconcilable.

![Migration flowchart](/img/database/migration-flow.png)

## Internal migrations

### Creating a migration

- Add a migration file in `packages/core/database/src/migrations/internal-migrations`
- Import it in the `index.ts` file of the same folder and add it to the exported array as the last element.

### Migration file format

Every migration should follow this API

```ts
export default {
  name: 'name-of-migration',
  async up(knex: Knex, db: Database): void {},
  async down(knex: Knex, db: Database): void {},
};
```

## User migrations

Strapi projects can add migration files under `database/migrations/`. They run **before** schema sync on boot when `settings.runMigrations` is true.

Use pre-sync migrations for DDL that Strapi will not auto-sync (custom tables, extra indexes, etc.).

## Post-sync migrations

Post-sync migrations live in `database/migrations-post/` and run **after** schema sync and repairs, but before the `strapi::content-types.afterSync` hook.

Use them to backfill data into columns Strapi just created from content-type changes in the same deploy.

```ts
export default {
  async up(knex) {
    await knex('articles')
      .whereNull('slug')
      .update({ slug: knex.raw("LOWER(REPLACE(title, ' ', '-'))") });
  },
};
```

Executed migrations are tracked in `strapi_migrations_post`. Generate a file with:

```bash
strapi generate
# → migration → pick post-sync phase
```

Post-sync migrations are DML-only (roll forward; no `down` support intended).
