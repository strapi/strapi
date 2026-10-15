---
title: Custom order
description: Entries arranged by hand in the list view, and returned in that order by the API
tags:
  - content-manager
---

Custom order lets editors arrange the entries of a collection type by hand in the list view. Once it is on for a collection type, the Document Service, and therefore the REST and GraphQL APIs, return its entries in that order whenever no `sort` is requested.

The feature is behind the `unstableCustomOrder` [future flag](../../06-future-flags.md).

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

- The **future flag** is read when the server starts. With the flag on, every collection type listed in the Content Manager gets a hidden `strapi_position` attribute (see `server/src/custom-order/index.ts`). Turning the flag off removes the attribute, and the schema sync drops the column with the order in it.
- The **setting** `settings.customOrder` is part of the list view configuration of each collection type, next to `defaultSortBy`. It is changed at runtime from "Configure the view", so it can't add a column: this is why the attribute exists on every collection type as soon as the flag is on.

Because the setting lives in the database and can be changed from another instance, each instance keeps the list of ordered content types in memory and refreshes it at most every 10 seconds (`isEnabled` in `server/src/custom-order/services/custom-order.ts`).

## The position

`strapi_position` is an integer, `private` (never returned by the Content API, not usable in its `sort` or `filters`) and not `visible` (absent from the schema sent to the admin).

- Every row of a document shares the same position: all its locales, draft and published. The order belongs to the document, not to its content.
- Positions are unique per document. They are not dense: gaps and negative values are expected. The number displayed in the list view is the index of the row in the current view, never the stored value.
- A new document takes `min - 1`, which puts it on top without touching any other row.
- Moving a document only shifts the documents between its old and new place, by one (`computeMove` in `services/utils.ts`).

Positions are written with `strapi.db.queryBuilder`, on purpose. Moving a document must not run lifecycles nor change `updatedAt`, otherwise every shifted entry would show up as "Modified".

### Keeping positions consistent

A Document Service middleware (`services/document-middleware.ts`) handles the content types that have custom order on:

| Action                    | Behaviour                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| `findMany`, `findFirst`   | Sorts by position when the request has no sort                                                     |
| `create`, `clone`         | Puts the new document on top                                                                       |
| `update`                  | Ignores a position passed in the data, and gives the document's position to a newly created locale |
| `publish`, `discardDraft` | Nothing to do: the Document Service copies every scalar column from one version to the other       |

Rows created while the setting is off, or without going through the Document Service, have no position. `assignMissingPositions` fixes that when the setting is turned on, when the server starts, and before each move:

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

After a move the list is fetched again. Until the answer lands the table keeps showing its rows (in the new order when the move stays within the page) instead of the loading state.

## Not supported yet

- Moving several entries at once.
- Dragging an entry to another page.
- Exposing the position in the Content API, or sorting on it explicitly.
- A different order per locale.
