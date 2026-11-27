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

`db.runWithAbortSignal(signal, callback)` runs the callback with an `AbortSignal` stored in an async context (`abortCtx`, [`src/abort-context.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/abort-context.ts)), the same way `transactionCtx` holds a transaction. The signal aborts when the client disconnects before the response ended. It exists so a request nobody waits for stops holding pooled connections (issue #28646).

#### Which requests get a signal

Only requests that read are armed ([`services/server/client-abort.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/server/client-abort.ts)):

- `GET` and `HEAD` requests. The server middleware arms them. Every other method (`POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`) runs without a signal, so nothing in a mutation is ever aborted and the routes of a mutation need no opt-out.
- GraphQL queries sent with `POST`. The GraphQL plugin ([`abort-queries.ts`](https://github.com/strapi/strapi/blob/develop/packages/plugins/graphql/server/src/abort-queries.ts)) parses the body after the body parser, picks the operation by `operationName` (or the only operation), and arms the request through `strapi.server.armClientAbortSignal` only when it is a `query`. A batch is armed only if every operation is a query. A body with no query text (persisted queries), a document that does not parse, or an operation that cannot be selected is not armed. Only `POST` is considered: a GraphQL `PUT`, `PATCH`, `DELETE` or `OPTIONS` is never armed, and a GraphQL `GET` is armed by the server like any other `GET`. The plugin adds this middleware only when the setting is on.

`strapi.server.armClientAbortSignal(ctx, run)` arms whatever the method, so a caller must know the request only reads. It is internal and optional on the `Server` type: a custom `Server` implementation or a mock does not have to provide it, so callers check for it first.

#### Routes that write on a GET

Some `GET` routes write. They opt out with `config.abortReadsOnRequestDisconnect: false` (typed in `@strapi/types`, validated in `routing.ts`, honored by [`compose-endpoint.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/server/compose-endpoint.ts)). A middleware placed before `authenticate` runs the rest of the route, authentication included, through `db.runWithoutAbortSignal`, so it also covers reads made before any controller code. Only `false` has an effect: any other value is ignored, so a route config never fails to load because of it. Like `runWithoutAbortSignal`, it marks the request as written, so nothing in it is aborted. These routes set it:

- Users & Permissions: `GET /auth/email-confirmation`, `GET /auth/:provider/callback` and `GET /connect/(.*)` (they confirm, create or sign in a user).
- Admin SSO (EE): `GET /admin/connect/:provider` (it serves the login redirect and the provider callback, which creates or updates the user and its session).
- Admin data transfer: `GET /admin/transfer/runner/push` and `GET /admin/transfer/runner/pull` (long lived websocket sessions, a push writes).

A new `GET` route that writes or has side effects must set the flag.

#### How the read abort works

When a signal is in context, `execute()` of the query builder changes only for reads: `select`, `count`, `max` and `min`. A read that locks rows (`forUpdate`) is not aborted.

- If the signal is already aborted, the read is not issued and `execute()` throws `QueryAbortedError`. Populate sub-queries go through `execute()` too, and `stream()` refuses to start.
- On clients that can cancel a query (`postgres`, `mysql`), the read is cancelled with the client's `cancelQuery` when the signal aborts. Outside a transaction the query builder acquires the pool connection itself to do this. Inside a transaction the cancel targets the transaction's connection. The query then rejects with `QueryAbortedError` (the driver error is its `cause`). A pool connection is always released, and it is marked disposed when the cancel fails, as Knex does for a timed out query. `settings.queryTimeout` still applies to the same query.
- On `sqlite` only the refusal applies, because the driver cannot cancel a running query.

A read inside a transaction is aborted like any other. `db.transaction` rolls the transaction back when its callback rejects, so the document service reads (`findMany`, `findFirst`, `findOne`, `count`, which run inside `wrapInTransaction`) are aborted without leaving anything behind.

#### Safety nets: writes are never aborted

A `GET` can still write or schedule work, so these stay even though mutations are not armed.

Once the flow writes, nothing is aborted anymore. The store in `abortCtx` is shared by everything the request runs, and the first write marks it as written: an `insert`, `update`, `delete` or `truncate` from the query builder, a `forUpdate` read, or a call to `db.runWithoutAbortSignal`. Every later query of the request runs to completion, including the reads that follow up on the write and the reads of other branches running at the same time. This also holds for a read that was already running, or waiting for a pool connection, when another branch wrote: the abort neither cancels nor refuses it, because `runAbortable` checks the flow's store again when the signal aborts and after the connection is acquired. So the only reads that are aborted are those of a flow that has not written anything when the signal aborts.

- The entity manager write methods (`create`, `createMany`, `update`, `updateMany`, `delete`, `deleteMany`, `attachRelations`, `updateRelations`, `deleteRelations`, `deleteManyRelations`, `insertJoinTableRows`) detach from the signal and mark the flow as written, as `db.runWithoutAbortSignal` does, lifecycles included ([`entity-manager/index.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/entity-manager/index.ts)). `update` and `delete` read the row before they write, and `create` reads it back after the insert.
- The document service runs its write actions (`create`, `update`, `delete`, `clone`, `publish`, `unpublish`, `discardDraft`) through `db.runWithoutAbortSignal`, middlewares included ([`document-service/client-abort.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/core/src/services/document-service/client-abort.ts)). It does so with a document middleware registered before every other one, so the rest of the chain runs detached. Document middlewares read outside the write's transaction, before it (review workflows) and after it commits (content history).
- Commit and rollback hooks run detached from the signal (`abortCtx.exit`), and so do the rollback hooks of a savepoint that was rolled back (or whose release failed), which run right away.
- `db.runDetachedFromAbortSignal(callback)` (internal) runs the callback detached from the signal without marking the flow as written, so the rest of the flow is still aborted. Event hub emits (listeners and subscribers) and cron jobs (creation of the timer and every run) use it, because their reads must not inherit the signal of the request that emitted the event or scheduled the job.
- The populate queries of a stream that already started run detached too.

`db.runWithoutAbortSignal(callback)` runs the callback detached from the signal and marks the calling flow as written. Use it for work that must run to completion although it reads before its first database write, when it can run under a `GET`.

#### Setting

The mechanism is opt-in: it runs only when `settings.abortReadsOnRequestDisconnect` is `true` (default `false`). It must be a boolean, and the constructor throws otherwise (a string such as `"true"` included: read it with `env.bool()`). It is off by default because work that a request starts without awaiting it inherits the signal (see the limits below), which would change behaviour for existing projects.

With the setting off (`false` or unset), nothing changes for the app:

- `runWithAbortSignal` runs the callback without storing the signal, so no flow ever has an abort context and no query is refused or cancelled. The server and the GraphQL plugin create no controller and add no listener.
- Nothing is wrapped or detached: the entity manager keeps its own write methods, the document write middleware only calls `next`, the GraphQL plugin does not add its middleware, the middleware of the route flag only calls `next`, and event hub emits and cron jobs run as they did before. Cron does not resolve `strapi.db` before Strapi is loaded.
- An error named `QueryAbortedError` is an ordinary error: logged as an error by REST and GraphQL, reported by Sentry, and stored as a failed check by Content Releases.

The route flag `config.abortReadsOnRequestDisconnect` and the optional `Server.armClientAbortSignal` are added to the public types. Both are optional, so existing routes and `Server` implementations still type check, and `routing.ts` never rejects a route because of the flag.

Limits:

- Queries run directly on `strapi.db.connection` (including `connection.raw`) are not covered, like `queryTimeout`. They are not aborted, and a write made this way does not mark the flow as written.
- A stream that already started is not cancelled: only starting one is refused. Its batch and populate queries run detached from the signal.
- Code reached from a `GET` that has a side effect outside the database (a file, an external API) and then reads before it writes can stop between the two. Set the route flag or run it in `db.runWithoutAbortSignal`.
- Other work that a request starts without awaiting it (`setTimeout`, an un-awaited promise) inherits the signal, so its reads are refused once the client disconnects, until the request writes. Its writes are not. Event hub listeners and cron jobs are the exception, they run detached. A refused or cancelled read rejects with `QueryAbortedError`: in work that nobody awaits or catches, that is an unhandled rejection. Node's default for those (`--unhandled-rejections=throw`) stops the process, and Strapi installs no `unhandledRejection` handler, so an app that turns the setting on must catch the errors of such work (or install a handler).
- A request waiting for a pool connection is not woken by the abort. The signal is checked before and after the connection is acquired only.
- Behind PgBouncer or Supavisor in transaction pooling mode the Postgres cancel (`pg_cancel_backend`) has no effect, as with `queryTimeout`. The read is still refused when issued after the abort.
- Each cancel opens one extra raw connection outside the pool (the same mechanism as `queryTimeout`), so many simultaneous disconnects can open up to `pool.max` extra connections.
- A cancel inside a transaction stops whatever statement runs on the transaction's connection. If concurrent branches share one transaction and one of them runs a detached read (`abortCtx.exit` without marking the flow), the cancel of a sibling read can hit that statement instead.
- Cancelling is best effort: a signal that aborts in the instant between acquiring the connection and the driver sending the query can still let that one query run to completion.

`QueryAbortedError` is not an internal error when the client really left. The REST error middleware and the GraphQL error formatter log it at debug level only when the setting is on and the client disconnected (the response was destroyed before it ended). Otherwise it is logged as an error. Under the same conditions the Sentry plugin does not report it. With the setting on, Content Releases rethrows it instead of storing an entry as not valid.

### Migrations

Two providers run migrations: the user provider for files in `database/migrations` of the application, and the internal provider for the migrations in `src/migrations/internal-migrations`. Each provider records the names it ran in its own table, `strapi_migrations` for user migrations and `strapi_migrations_internal` for internal ones. Read [Migrations](./03-migrations.md).

### Lifecycles

`db.lifecycles` runs subscribers around each query with an `Event` (`action`, `model`, `params`, `state`, `result`). Two subscribers exist by default: one sets timestamps, and one calls the `lifecycles` functions of a model. Read [Lifecycles](./04-lifecycles.md).

### Query scopes

`db.unstable_scopes` holds query scopes. The API is unstable. A scope returns a `where` condition per model, and the query builder ANDs it into most queries and joins to model tables. Read [Query scopes](./05-query-scopes.md).

### Repairs

`db.repair` holds two data repair operations, `removeOrphanMorphType` and `processUnidirectionalJoinTables`. `@strapi/core` runs them during `bootstrap()` after a schema sync. Code: [`src/repairs`](https://github.com/strapi/strapi/tree/develop/packages/core/database/src/repairs).

## Related

- [Schema sync](../../../architecture/07-schema-sync.md): how content types become tables at boot.
- [Document write path](../../../architecture/05-document-write-path.md): how the Document Service calls this package.
- [Server lifecycle](../../../architecture/02-server-lifecycle.md): where `init` and `sync` run.
- [Glossary](../../../architecture/11-glossary.md): naming traps for lifecycles and hooks.
- [`@strapi/core`](../core/index.md): creates `strapi.db` and runs the repairs.
- [`@strapi/utils`](../utils/index.md): shared helpers and errors that this package uses.
