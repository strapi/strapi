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

User migrations live in the application's `database/migrations` directory (or `<outDir>/database/migrations` when `database.settings.useTypescriptMigrations` is enabled, in which case the compiled output is discovered). They run before schema sync, inside a transaction, and receive `(knex, db)` where `db` is the `Database` instance. In `strapi develop`, the cluster primary recompiles the app before it forks the new worker on every reload, so a `.ts` migration written to the source directory (for example by the Content-Type Builder) is emitted to `<outDir>/database/migrations` and discovered on that same reload. `strapi build` does the same for production.

### File ordering

Discovery lists `*.js` and `*.sql` files in the migrations directory (non-recursively) and runs them **sorted by file name**. There is no other ordering mechanism, so the file name prefix decides the order.

`strapi generate migration` names files `YYYY.MM.DDTHH.mm.ss.<name>.<js|ts>` (see `packages/generators/generators/src/plops/utils/get-formatted-date.ts`).

### Generated rename migrations

When a field is renamed in the Content-Type Builder, a migration named `YYYY.MM.DDTHH.mm.ss.SSS.rename-fields.<js|ts>` is written to the app's source `database/migrations` directory (`packages/core/database/src/migrations/file-builder.ts`). The file is written before the schema files. If the save fails after that (schema write or folder commit), the Content-Type Builder deletes the file while rolling the save back, so a rejected save never leaves a migration behind. The prefix is the same shape as the generator's, with milliseconds appended and expressed in **UTC**, so:

- generated files interleave predictably with hand-written ones by timestamp;
- two saves within the same second do not collide;
- developers in different time zones produce files that sort in creation order.

Within the same second, a generated file (whose next characters are millisecond digits) sorts before a hand-written file whose name starts with a letter. To interleave your own migration deterministically with a generated one, use the same timestamp prefix and pick a later time.

The generated file only calls the guarded helpers on `db.schema` (`renameColumn`, `renameTable`, `updateRows`, `applyAttributeRenames` — see `packages/core/database/src/schema/rename-helpers.ts`). Each helper checks that the source exists and the target does not before doing anything, so the file is a safe no-op on a fresh database. Skipped steps are logged: at `info` level when the source is missing (expected on a fresh database) and at `warn` level when the target already exists (the environment drifted and the rename was not applied).

#### Stores keyed by attribute name

Some data outside the content tables refers to fields by name, for example the `properties.fields` of admin role and admin API token permissions. The boot cleanup removes every stored field path that is not in the new schema, so after a rename every role but the super admin would lose access to the field.

Every generated file therefore ends with one logical step that carries the save's renames, composed per model from the first name to the last (`a -> tmp, b -> a, tmp -> b` becomes `{ a: 'b', b: 'a' }`):

```js
await db.schema.applyAttributeRenames(knex, {
  renames: {
    'api::article.article': { title: 'heading' },
    'default.hero': { caption: 'label' },
  },
});
```

`@strapi/database` only dispatches it: `applyAttributeRenames` calls every handler registered with `db.schema.registerAttributeRenameHandler(handler)`, in registration order, with the migration's transaction. Handlers must be registered during the register phase, because user migrations run during schema sync, before any plugin bootstrap. The admin registers one that rewrites permission field paths (including paths through components, so a parent rename and a rename inside its component compose) before its bootstrap cleanup runs. Other stores keyed by attribute name, such as Content Manager layouts, can register on the same hook. With no handler registered, the step is a logged no-op. The step is written even when every hop of the save was refused, since the logical field is the same field even when its data could not be carried.
