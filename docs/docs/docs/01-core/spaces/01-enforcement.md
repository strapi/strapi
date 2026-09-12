---
title: How isolation is enforced
tags:
  - spaces
  - multi-tenancy
  - database
---

# How isolation is enforced

The hard part of multi-tenancy is not adding a `space_id` column. It is making
sure every route, plugin, relation and background job respects it — including
the ones nobody remembered to change.

So the boundary is placed where there is only one of it.

## The query scope

`@strapi/database` exposes a registry of **query scopes**: `where` clauses added
to every query it builds.

```ts
db.queryScopes.register('spaces', ({ uid, meta, operation }) => {
  // return a where clause, or null to leave the query alone
});
```

They are applied in `QueryBuilder#processState`, which every statement passes
through. That matters because the routes into the database do not share a
service-level choke point:

| Route into the database                              | Covered                                   |
| ---------------------------------------------------- | ----------------------------------------- |
| `strapi.documents(uid).findMany()`                   | yes                                       |
| `strapi.db.query(uid).findMany()`                    | yes                                       |
| A populated relation (a separate query per relation) | yes                                       |
| `db.queryBuilder(uid)` used directly                 | yes                                       |
| `updateMany` / `deleteMany`                          | yes                                       |
| Relation attach/update statements                    | yes                                       |
| `INSERT`                                             | no — there are no existing rows to narrow |

Database lifecycles would have covered only the first two: they do not fire for
populated relations, and `db.lifecycles.disable()` turns them off wholesale
during a data transfer. The query scope has neither hole.

What it does **not** cover is a table brought into a query by a JOIN. A filter
or a sort on a relation compiles to a JOIN inside one query rather than to a
second query, and a scope narrows queries. So `filters[author][name]` is
answered against every row of `authors`.

The caller still only gets their own rows back — the JOIN decides which of
_their_ rows match and selects nothing from the joined table — so what leaks is
the existence of a matching row, and only for rows their own content already
links to. Creating such a link across spaces is refused on write, so setting one
up takes data that predates tenancy. Closing it properly means scoping JOINs as
well as queries; until then the gap is pinned by a test in
`packages/core/database/src/__tests__/query-scopes-sqlite.test.ts` rather than
assumed covered.

Clauses are pushed into `state.where`, which is ANDed as a whole, so a caller
cannot widen past a scope with an `$or` of their own.

Scopes run on the hot path. Keep them synchronous, and let them decline
(`return null`) for models they know nothing about.

## What the clause says

Inside a space, a row is visible if it belongs to that space **or** to none:

```sql
WHERE (space_id = ? OR space_id IS NULL)
```

A row with no space is shared — data every space reads and only the all-spaces
view writes. That is how reference content, and anything seeded before Spaces
was switched on, stays reachable.

Records _about the platform_ invert that rule. An audit log or a history version
with no space is the platform's own record, and showing it to a tenant would
hand them a view of everyone else's activity, so for those models the clause is
just `space_id = ?`. The list lives in `PLATFORM_WHEN_UNASSIGNED_UIDS`.

## Fail closed

A scope is one of four things:

- `space` — one space;
- `global` — every space at once, which needs `plugin::spaces.spaces.access-all`;
- `unscoped` — no request at all: bootstrap, a migration, the CLI;
- `unresolved` — inside a request that never settled a space.

`unresolved` is the important one. It does **not** mean "no filter": reading
space-scoped data in that state is refused. Absence of an answer to "which
space?" returns nothing rather than everything, so a route that reaches the
database before its scope is settled fails loudly instead of leaking quietly.

## Where the scope comes from

```text
getScope()
  1. an explicit scope        runInSpace / runGlobal / runUnscoped
  2. request.state.space      settled once, after authentication
  3. { mode: 'unscoped' }     no request at all: trusted code
```

Inside a request, the space lives on `ctx.state` and is read through Koa's own
request-local storage, which Strapi already maintains — so no second ambient
mechanism is introduced for the common case.

The explicit override exists for work that is not a request, or that must act
for another space: a release publishing at its scheduled time takes its space
from the release rather than from the caller, because there is no caller.

## Settling a request's space

The plugin registers an `auth.onAuthenticated` handler, which runs once the
caller's identity is known and before any policy or controller — for
authenticated and anonymous callers alike.

The rules, in order:

1. A token acts in the space it was issued in, whatever the request asks for.
2. A caller who may access all spaces gets what they asked for, including `*`.
3. Anyone else must be a member of the space they name.
4. A caller who names nothing lands in their default space.
5. A caller who belongs to no space is left `unresolved` — not refused, so the
   admin still loads and can say why.

Naming a space you may not enter is refused outright; simply having none is not.
That distinction is what keeps a new administrator from being locked out of the
application while still being unable to read anyone's content.
