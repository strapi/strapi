# Spaces at 1,000,000 documents — measured

App: `test-apps/api`, SQLite, `benches` = 1,000,000 documents / 1,500,000 rows
(draft + published), split shared 100k / default 100k / acme 400k / globex 300k /
initech 100k. Median of 5 runs, `ANALYZE` run after every index change.
Docker was not available, so **SQLite only** — directional for a planner as weak
as SQLite's; Postgres has real statistics and a BitmapOr it can use here.

## The hypothesis, checked

`space_id` does get an index — the FK index `benches_space_id_fk`, created by
`schema.ts` for every join column. It is single-column, and it _is_ used:
`space_id = X OR space_id IS NULL` becomes a MULTI-INDEX OR of two index
searches. Scoping does not defeat it.

And scoping does not make reads slower — it makes them faster, because it
narrows before anything else runs:

| query                 | workspace (500k visible) | default (1M, unfiltered) |
| --------------------- | ------------------------ | ------------------------ |
| list page, sort title | 81 ms                    | 116 ms                   |
| search `_q`           | 100 ms                   | 168 ms                   |
| count                 | 71 ms                    | 48 ms                    |

## What actually costs

`ORDER BY` over the OR-union: every list page materialises the union in a temp
b-tree before sorting, for ten rows.

|                                                                   | ms    |
| ----------------------------------------------------------------- | ----- |
| list page, `space_id = X OR space_id IS NULL`, sort title         | 81    |
| list page, `space_id = X` alone, with a `(space_id, title)` index | **0** |

That gap is the price of "shared entries are NULL": two values in the predicate,
so no index can deliver the rows already ordered.

## Indexes: what helps and what backfires

| query                                | baseline (FK only) | + (space_id, published_at, locale) |
| ------------------------------------ | ------------------ | ---------------------------------- |
| count (pagination total)             | 158 ms             | **35 ms**                          |
| list page, sort id desc (CM default) | **84 ms**          | 400 ms                             |
| list page, sort title                | 174 ms             | 180 ms                             |
| search                               | 228 ms             | 274 ms                             |

The composite makes the count 4.5× faster and the Content Manager's default
sort 4.8× slower: with it available SQLite switches to a skip-scan
(`SEARCH ... (ANY(space_id) AND published_at=? AND locale=?)`) and loses the
backwards rowid walk that answered `ORDER BY id DESC LIMIT 10` cheaply. Adding
`id` to the composite does not rescue it; `(space_id, id)` alone is ignored.

**Conclusion: ship no list-shaped composite.** The FK index already serves the
predicate, and every composite tested trades one query shape for a worse one.

`(space_id, document_id)` is different — it never tempted the planner away from
a better plan in any configuration, and it is what the override exclusion
subquery needs.

## Notes for whoever revisits this

- `space_id IN (X, NULL)` is **not** the same predicate: SQL `IN` never matches
  NULL. The `$or` form is load-bearing.
- Deep pagination (`OFFSET 50000`) is 380 ms and is not a spaces problem.
- `findOne` by documentId is free (the `documents` index covers it) — including
  with the workspace predicate ANDed on.
- The document service adds ~1 ms on top of the SQL for a ten-row page.

## The read filter was joining a table it did not need

`db-read-net.ts` expressed the predicate as a relation — `{ space: { id: X } }` —
which the query builder turns into a LEFT JOIN of the `spaces` table **per `$or`
branch**, so two joins plus `SELECT DISTINCT` on every read of every scoped
content type:

```sql
select distinct t0.id, t0.* from benches as t0
  left join spaces as t1 on t0.space_id = t1.id
  left join spaces as t2 on t0.space_id = t2.id
where ((t1.id = ? or t2.id is null) ...)
```

Filtering on the join column directly emits `t0.space_id = ?` and no join at
all. Interleaved, min of 15 runs (the machine runs other dev servers, so the
floor is the honest number):

| query                 | relation form | raw column form |
| --------------------- | ------------- | --------------- |
| list page             | 239.9 ms      | **223.4 ms**    |
| count                 | 137.4 ms      | **125.3 ms**    |
| findOne by documentId | 0.3 ms        | **0.1 ms**      |

7-9% for free on SQLite, and more on a server database, where two joins cost
planning as well as execution.
