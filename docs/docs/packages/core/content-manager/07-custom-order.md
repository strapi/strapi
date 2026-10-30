---
title: Custom order
description: Entries arranged by hand in the list view, and returned in that order by the API
---

Custom order lets editors arrange the entries of a collection type by hand in the list view. Once it is on for a collection type, the Document Service, and therefore the REST and GraphQL APIs, return its entries in that order whenever no `sort` is requested.

The feature is behind the `unstableCustomOrder` [future flag](../../../architecture/10-future-flags.md).

```ts
// config/features.ts
export default {
  future: {
    unstableCustomOrder: true,
  },
};
```

## How it is turned on

There are two levels:

- The **future flag** is read when the server starts. With the flag on, every collection type listed in the Content Manager gets a hidden `strapi_position` attribute and an index on it (see `server/src/custom-order/index.ts`). Turning the flag off removes the attribute, and the schema sync drops the column with the order in it when `forceMigration` is on, which is the default.
- The **setting** `settings.customOrder` is part of the list view configuration of each collection type, next to `defaultSortBy`. It is changed at runtime from "Configure the view", so it can't add a column: this is why the attribute exists on every collection type as soon as the flag is on.

Because the setting lives in the database and can be changed from another instance, each instance keeps the list of ordered content types in memory and refreshes it at most every 10 seconds (`isEnabled` in `server/src/custom-order/services/custom-order.ts`).

## The position

`strapi_position` is an integer, `private` (never returned by the Content API, not usable in its `sort` or `filters`) and not `visible` (absent from the schema sent to the admin).

- Every row of a document shares the same position: all its locales, draft and published. The order belongs to the document, not to its content.
- Positions are unique per document. They are not dense: gaps and negative values are expected. The number displayed in the list view is the index of the row in the current view, never the stored value.
- A new document takes `min - 1`, which puts it on top without touching any other row.
- Moving a document only shifts the documents between its old and new place, by one (`computeMove` in `services/utils.ts`).
- Every sort on the position is completed with the `id` of the row, most recent first. Positions alone are not a total order (every row of a document shares one, and rows written outside of the Document Service have none), and each database places equal and `NULL` values differently, not always on the same page.

Positions are written with `strapi.db.queryBuilder`, on purpose. Moving a document must not run lifecycles nor change `updatedAt`, otherwise every shifted entry would show up as "Modified".

### One writer at a time

A new document and a move both read positions before writing them. Two at the same time would give two documents the same position, and nothing could tell those two apart afterwards. Every writer runs in a transaction that first takes a lock on the order of the content type (`withOrderLock` in `services/custom-order.ts`): a `SELECT ... FOR UPDATE` on the row of the core store holding the list view settings of the content type, which exists whenever custom order is on. PostgreSQL and MySQL hold it until the transaction ends. SQLite ignores it, its single connection serializes writers anyway.

The lock is taken by the Document Service middleware when it creates a document (the insert runs in the same transaction), by a move, and when positions are given to rows that have none.

### Keeping positions consistent

A Document Service middleware (`services/document-middleware.ts`) handles the content types that have custom order on:

| Action                    | Behaviour                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `findMany`, `findFirst`   | Sorts by position when the request has no sort, and completes a sort ending on the position with the `id` |
| `create`, `clone`         | Puts the new document on top, under the lock                                                              |
| `update`                  | Gives the document's position to a newly created locale                                                   |
| `publish`, `discardDraft` | Nothing to do: the Document Service copies every scalar column from one version to the other              |

Whether the setting is on or off, the middleware drops `strapi_position` from the data of every write to a content type that has the attribute. The position is not content, and a value written while the setting is off would be taken for a real position once it is turned on.

Rows created while the setting is off, or without going through the Document Service (an import, a raw query), have no position. `assignMissingPositions` fixes that when the setting is turned on, when the server starts, before each move, and at each refresh of the settings (at most every 10 seconds), so that such rows don't sit at one end of the list, which end depending on the database, for long:

- a row whose document already has a position takes it;
- if nothing is ordered yet, documents are ordered by creation, which is the order the API returned until then;
- otherwise the remaining documents go on top, the most recent first.

## Moving a document

```
POST /content-manager/collection-types/:model/:id/actions/move
{ "before": "<documentId>" } or { "after": "<documentId>" }
```

The endpoint requires the `plugin::content-manager.explorer.update` permission on the moved document. There is no endpoint that takes a position number: a number only means something in a given view (locale, filters, search), while "before this document" is unambiguous.

## Admin

Everything is in `admin/src/pages/ListView/components/CustomOrder.tsx`, used by `ListViewPage.tsx`.

- An **Order** column is added in front of the table. It is a regular sortable header: sorting on it is how the user comes back to the custom order after sorting on something else. Entries can only be moved while the list is sorted on it, in ascending order.
- **Dragging** uses `@dnd-kit` with a pointer sensor only, and is limited to the current page. On drop, the admin sends `before` or `after` the row the entry was dropped on.
- **Typing a position** works across pages. The admin first asks the list endpoint which entry sits at that position in the same view (`page = position`, `pageSize = 1`), then moves the entry before or after it.
- **Move to top / Move to bottom** in the row menu are typed positions `1` and "past the end".

Two things in there are dictated by the design system table:

- Its rows don't forward refs, so the node given to `@dnd-kit` is the parent of the position cell.
- The grid handles the arrow keys itself, which rules out dragging with the keyboard. The position input and the row actions are the keyboard path; the input stops the propagation of its key events so that typing does not move the focus in the grid.

After a move the list is fetched again. Until the answer lands the table keeps showing its rows (in the new order when the move stays within the page) instead of the loading state, and no other move can start. The list is asked again when the request that answered started before the server applied the move, otherwise the table could settle on a stale snapshot (`refetchList` in `useCustomOrder`).

## Elsewhere in Strapi

- **Data transfer**: the schema check of `strapi export`, `import` and `transfer` ignores `strapi_position`, so the flag can be on at one end only. Positions travel with the rows when both ends have the attribute; otherwise the destination gives positions again, as for any row written outside of the Document Service.
- **Documentation plugin**: attributes that are both `private` and not `visible` are left out of the generated schemas.

## Not supported yet

- Moving several entries at once.
- Dragging an entry to another page.
- Exposing the position in the Content API, or sorting on it explicitly.
- A different order per locale.
- Relations: a populated relation, and the relations endpoints of the Content Manager, return the related entries in their own order, not in the custom order of their collection type.
