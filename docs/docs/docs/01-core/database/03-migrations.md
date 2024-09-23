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
