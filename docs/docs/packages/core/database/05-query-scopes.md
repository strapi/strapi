---
title: Query scopes (unstable)
sidebar_label: Query scopes
description: How db.unstable_scopes narrows query builder queries with a where condition per model, where the scopes apply, and the paths they do not cover.
tags:
  - backend
  - relations
---

:::caution Unstable
`db.unstable_scopes` is unstable. Its name and its contract can change in a minor release. It will get a stable name when a second user confirms the contract.
:::

A query scope is a function that returns a `where` condition for a model. A plugin registers it on `db.unstable_scopes`. The query builder ANDs every condition into the query, so a scope can only hide rows. It can never add rows to a result.

A plugin uses a scope to narrow every query to the rows that a request may see. For example, a plugin keeps the rows of several groups in the same tables. A read sees the rows of its group and the shared rows, and a write changes only the rows of its group. The `type` in the scope context lets one scope return a different condition for reads and for writes.

Code: [`src/query/scopes.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/query/scopes.ts) (registry), [`src/query/query-builder.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/query/query-builder.ts) (`processState` and `scopeJoin`), [`src/query/helpers/join.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/database/src/query/helpers/join.ts) (`Join.uid`, `idColumn` and `scope`). Tests: `src/query/__tests__/scopes.test.ts` and `tests/api/core/database/query-scopes.test.api.ts`.

## The contract

```ts
import type { QueryScope } from '@strapi/database';

const hideDeleted: QueryScope = {
  where: ({ uid }) => (uid === 'api::article.article' ? { deleted_at: null } : null),
};

const unregister = strapi.db.unstable_scopes.register(hideDeleted);

// Later: removes this scope
unregister();
```

`@strapi/database` exports the types `QueryScope`, `QueryScopeContext` and `ScopeRegistry`.

### `register(scope)`

- `register` adds the scope and returns a function that removes it.
- You can register several scopes. The query builder ANDs each non-null condition.

### `where({ uid, meta, type })`

- `uid` is the uid of a model, or the name of a join table. The entity manager reads and deletes relation links through a query builder on the join table. A scope returns `null` for every uid that it does not own.
- `meta` is the metadata of `uid`.
- `type` is `select`, `count`, `update` or `delete`. It is the query type of the main table. An `increment` or a `decrement` is an `update`. A join always gets `select`, also inside an `update` or a `delete`, because a join reads its target.
- `where` is synchronous and must not query the database. The scope owner settles its state before the query runs. Core has no `prepare` step.
- `where` uses the same syntax as `qb.where()`. A key that is not an attribute resolves to a raw column of the scoped table, so `{ group_id: 5 }` filters the `group_id` column with no join. A key that names a relation adds a join, as in any filter.
- `where` returns `null` to leave the query unscoped. Only `null` means "do not scope". A return of `undefined` throws.
- An error thrown by `where` stops the query and goes to the caller.

### Single-use builders

A query builder evaluates the scope conditions once, in `processState`. Do not change or run a builder again after `execute()` or `stream()`.

## Where the scopes apply

| Query part                                                                                         | Behavior                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main table of `select`, `count`, `update`, `delete` (an `increment` or `decrement` is an `update`) | Each non-null condition is ANDed into the `WHERE` clause. `type` is the query type.                                                                           |
| Main table of `insert`, `truncate`, `max`, `min`                                                   | Not scoped. `where` is not called, also not for the joins of a `max` or `min`.                                                                                |
| Main table of a join table (relation link reads and deletes in the entity manager)                 | `where` gets the join-table name as `uid`.                                                                                                                    |
| Join to a model table through a join column or a morph column                                      | The `ON` clause gets `AND EXISTS (SELECT 1 FROM <target table> AS <new alias> WHERE <new alias>.id = <alias>.id AND <scope>)`. `where` gets `type: 'select'`. |
| Join to a join table that leads to a model table (pivot join table, morph join table)              | The join-table join gets the same `EXISTS` condition on the column that holds the target id. The join to the target table after it is not scoped again.       |
| `update` and `delete` with joins (the `runSubQuery` path)                                          | The inner `SELECT id` carries the scoped `WHERE` and the scoped joins, inside the nested `SELECT id FROM (…) AS subQuery`.                                    |
| Populate                                                                                           | Each populate query runs through a query builder on the target model or the join table, so the main-table rule covers it.                                     |
| Streams (`qb.stream()`)                                                                            | Same as `select`.                                                                                                                                             |

A hidden row reads as no row through a join, for filters, sorts and writes alike. On a join-table join, the condition is on the link, not on the target join. A link to a hidden row then matches nothing. Without this, the left join to the target would give a row of NULLs, and a `$null` filter or a `deleteMany` could match through it.

A join uses the `select` condition inside a write. An `updateMany` with a filter on a related row therefore matches when `select` sees that row, even if an `update` condition on the model of that row would hide it.

Joins that `createJoin` and `createPivotJoin` build carry the target `uid` on the `Join` object, and `idColumn` for a join-table join. `processState` adds the `scope` condition to these joins after `processWhere`, so the joins that filters and scope conditions add are scoped too.

### Why a correlated `EXISTS`

The join condition is a correlated `EXISTS`, not `IN (SELECT id …)`. On SQLite the `IN` form was about 350 times slower on a list page with a relation filter, because SQLite probes the link index once per row and per visible id.

The `EXISTS` subquery is built by a query builder with scopes switched off (`scoped: false`), so a scope whose `where` names a relation cannot recurse. The subquery takes its aliases from the alias counter of the outer query, so its aliases never shadow an outer alias.

## Empty registry

With no scope registered, `db.unstable_scopes.isEmpty()` is true. The query builder skips the main-table and join conditions and builds the same SQL as before query scopes existed. `src/query/__tests__/sql-parity.test.ts` records it.

## Accepted exceptions

Scopes are not a security boundary. The paths below can still read, write or link hidden rows, so a plugin that uses scopes for access control needs its own checks.

These paths are not fully scoped, or behave differently while a scope is active.

- Raw `getConnection()` paths: draft and publish relation cloning (`clone-relations.ts` in `@strapi/core`), the component parent lookup (`components.ts` of the Document Service), and order cleanup (`cleanOrderColumns`, `cleanMorphToManyOrderColumn`).
- Connect or set by id (`attachRelations`) writes join rows for any target id. The scope owner must check that the target is visible.
- `max` and `min` are not scoped. The upload folder service (`packages/core/upload/server/src/services/folder.ts`) computes `max(pathId) + 1` across all rows, so that a path id is unique in all scopes. A third-party `max()` reads across scopes.
- morphToMany `populate` with `count: true` counts the scoped join rows but does not filter their targets. The scope owner handles it.
- morphToOne `populate` with `count: true` returns `{ count: 1 }` when the morph columns of the row are set. It runs no query, so a hidden target still counts. The scope owner handles it.
- While a scope is active, `em.update` and `em.delete` of a row that the scope shows to reads but hides from writes leave the row unchanged, but still write or delete its relation links (`updateRelations` and `deleteRelations` in `entity-manager/index.ts`). The scope owner handles it. For example, it can refuse these writes in the `beforeUpdate` and `beforeDelete` database lifecycles.
- Core writes with joins, for example relation ordering, see narrowed joins while a scope is active.
- A raw `qb.join()` to a model table with no `uid` is not scoped. No core caller joins a model table this way.
- Undo writes after a failed create or update (`entity-manager/index.ts`) run through scoped builders. If the write changed a column that a scope filters on, the undo matches no row.

## Related

- [`@strapi/database`](./index.md): the package overview.
- [Polymorphic relations](./01-relations/polymorphic-relations.md): morph columns and morph join tables.
