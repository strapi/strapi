---
title: '@strapi/database'
sidebar_label: 'database'
description: 'Database layer on top of Knex: model metadata, schema sync, migrations, queries, relations, lifecycles and transactions.'
package: '@strapi/database'
status: draft
review_notes:
  - Written from the package source on develop; needs a maintainer review.
---

## Purpose

`@strapi/database` is the database layer of the server. It sits on top of Knex and turns content type schemas into tables, columns and join tables. It keeps the database schema in sync with the application, and it runs queries, relation writes, migrations, lifecycles and transactions. It runs on the server only.

`@strapi/core` creates one `Database` instance and exposes it as `strapi.db`. The Document Service and the core services read and write data through it. Application developers use `strapi.db.query(uid)`, `strapi.db.transaction` and the `Event` type of lifecycles. The package README says it is meant to be used inside Strapi only.

## Key concepts

### The `Database` class

`Database` in [`src/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/index.ts) owns the Knex connection, the dialect and the providers listed below. The constructor builds them. `init({ models })` loads the models into the metadata and validates them. `@strapi/core` calls `init` and then `schema.sync()` during `bootstrap()`. See [Server lifecycle](../../../architecture/02-server-lifecycle.md).

### Dialects

A `Dialect` class per client hides the differences between databases. The clients are `sqlite`, `postgres` and `mysql`. Each dialect has a schema inspector that reads the current database schema. The `mysql` dialect also serves MariaDB. Code: [`src/dialects`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/dialects).

### Metadata

`Metadata` is a map from a model UID to its `Meta`. `loadModels` builds the table names, the column-to-attribute map and the relations from the models. Every relation that declares a `target` must point to a loaded model, on the inverse (`mappedBy`) side too. Otherwise `loadModels` throws `Error on attribute <attribute> in model <name>(<uid>): Metadata for "<target>" not found`, and Strapi fails to boot. An inverse side stores nothing itself: it reads the join column or join table of the owner on the target that points back to it with `inversedBy`. If no relation on the target points back with `inversedBy: <attribute>`, `loadModels` throws `Error on attribute <attribute> in model <name>(<uid>): mappedBy attribute <mappedBy> in <target> must be a relation to <uid> with inversedBy "<attribute>"`. The `mappedBy` name only picks which attribute on the target is checked first and appears in the error; whether the app loads does not depend on it, so an owner that points back under another name still loads. `@strapi/core` builds the models from content types and components with `transformContentTypesToModels`. The database never reads content type files itself. Code: [`src/metadata`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/metadata).

### Schema sync

`db.schema.sync()` converts the metadata into a schema and compares it with the stored one. It runs pending migrations first. If the schema hash changed, `syncSchema` makes a three-way diff of the database schema, the previously stored schema and the new schema, and applies it through the schema builder. The stored copy lives in the `strapi_database_schema` table. Read [Schema sync](../../../architecture/07-schema-sync.md) for the full flow. Code: [`src/schema`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/schema).

### Entity manager, repositories and query builder

`db.query(uid)` returns a repository with `findOne`, `findMany`, `create`, `update`, `delete`, `count` and relation helpers. The entity manager implements them and delegates to the query builder, which builds Knex queries for filters, populate, ordering and search. Repositories work at the row level. The Document Service adds draft and publish and locale logic on top. See [Document write path](../../../architecture/05-document-write-path.md). Code: [`src/entity-manager`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/entity-manager) and [`src/query`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/query).

### Relations

The entity manager writes relations into join tables and keeps their order. Polymorphic relations store the target type next to the target id, in inline columns or in the join table. Read [Polymorphic relations](./01-relations/polymorphic-relations.md) and [Reordering](./01-relations/reordering.md).

### Transactions

`db.transaction(callback)` runs the callback in a Knex transaction. It stores the transaction in an async context (`transactionCtx`), so queries inside the callback use it without an explicit argument. Nested calls reuse the outer transaction. Read [Transactions](./02-transactions.md).

### Abort context

`db.runWithAbortSignal(signal, callback)` runs the callback with an `AbortSignal` stored in an async context (`abortCtx`, [`src/abort-context.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/abort-context.ts)), the same way `transactionCtx` holds a transaction. `@strapi/core` calls it for every HTTP request ([`services/server/client-abort.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/server/client-abort.ts)): the signal aborts when the response closes before it ended, which means the client disconnected. It exists so a request nobody waits for stops holding pooled connections (issue #28646).

When a signal is in context, `execute()` of the query builder changes only for a query that is a `select` and runs outside a transaction (neither `transactionCtx` nor `qb.transacting()` is set). Writes and anything inside a transaction always run to completion, so a disconnect never leaves partial work.

- If the signal is already aborted, the query is not issued and `execute()` throws `RequestAbortedError`. Populate sub-queries go through `execute()` too, and `stream()` refuses to start.
- On clients that can cancel a query (`postgres`, `mysql`), the query builder acquires the connection itself, and cancels the running query with the client's `cancelQuery` when the signal aborts. The query then rejects with `RequestAbortedError` (the driver error is its `cause`). The connection is always released, and it is marked disposed when the cancel fails, as Knex does for a timed out query. `settings.queryTimeout` still applies to the same query.
- On `sqlite` only the refusal applies, because the driver cannot cancel a running query.

The mechanism is opt-in: it runs only when `settings.cancelQueriesOnClientDisconnect` is `true` (default `false`). With the setting unset, `runWithAbortSignal` runs the callback without storing the signal, so nothing changes. It must be a boolean, and the constructor throws otherwise. It is off by default because work that a request starts without awaiting it inherits the signal (see the limits below), which would change behaviour for existing projects.

Limits:

- Queries run directly on `strapi.db.connection` (including `connection.raw`) are not covered, like `queryTimeout`.
- A stream that already started is not cancelled.
- Work that a request starts without awaiting it inherits the signal, so its `select` queries are refused once the client disconnects. Its writes are not.

`db.runWithoutAbortSignal(callback)` runs the callback detached from the signal (`abortCtx.exit`). The document service runs its write actions (`create`, `update`, `delete`, `clone`, `publish`, `unpublish`, `discardDraft`) through it, middlewares included ([`document-service/client-abort.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/document-service/client-abort.ts)). Document middlewares read outside the write's transaction, before it (review workflows) and after it commits (content history), and a refused read would fail a write that already committed.

- Cancelling is best effort: a signal that aborts in the instant between acquiring the connection and the driver sending the query can still let that one query run to completion.

`RequestAbortedError` is not an internal error. The REST error middleware and the GraphQL error formatter log it at debug level instead of error.

### Migrations

Two providers run migrations: the user provider for files in `database/migrations` of the application, and the internal provider for the migrations in `src/migrations/internal-migrations`. Each provider records the names it ran in its own table, `strapi_migrations` for user migrations and `strapi_migrations_internal` for internal ones. Read [Migrations](./03-migrations.md).

### Lifecycles

`db.lifecycles` runs subscribers around each query with an `Event` (`action`, `model`, `params`, `state`, `result`). Two subscribers exist by default: one sets timestamps, and one calls the `lifecycles` functions of a model. Read [Lifecycles](./04-lifecycles.md).

### Repairs

`db.repair` holds two data repair operations, `removeOrphanMorphType` and `processUnidirectionalJoinTables`. `@strapi/core` runs them during `bootstrap()` after a schema sync. Code: [`src/repairs`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/repairs).

## Related

- [Schema sync](../../../architecture/07-schema-sync.md): how content types become tables at boot.
- [Document write path](../../../architecture/05-document-write-path.md): how the Document Service calls this package.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): where `init` and `sync` run.
- [Glossary](../../../architecture/11-glossary.md): naming traps for lifecycles and hooks.
- [`@strapi/core`](../core/index.md): creates `strapi.db` and runs the repairs.
- [`@strapi/utils`](../utils/index.md): shared helpers and errors that this package uses.
