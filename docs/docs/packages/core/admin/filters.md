---
title: Filters
description: 'How the admin Filters component stores filter values in the URL, and how date-time filters reach the API.'
tags:
  - frontend
  - public-api
---

`Filters` in [`admin/src/components/Filters.tsx`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/components/Filters.tsx) is the filter bar of the list pages: the Content Manager list view, the audit logs and other admin lists. A page gives `Filters.Root` its `options`, one `Filters.Filter` per field. The popover writes each filter to the URL as an entry of `filters[$and]`:

```ts
{ [name]: { [operator]: value } }
// a relation filters on its main field
{ [name]: { [mainField.name]: { [operator]: value } } }
```

The page reads the URL and sends the filters to its API.

## Date-time filters

A filter takes a date-time value when its type, or the type of its main field, is `datetime`, and it has no `input` of its own. Its input is a date and an optional time:

- a date alone is stored as `YYYY-MM-DD` and matches that whole day
- a date and a time are stored as an ISO string and match that minute
- the tag shows the date, and the time only when one was picked

Stored dates have seconds and milliseconds, so the API can't read these values as they are. `toApiFilters(filters, options)` in [`admin/src/utils/dateTimeFilters.ts`](https://github.com/strapi/strapi/blob/develop/packages/core/admin/admin/src/utils/dateTimeFilters.ts) turns each one into the bounds of its day or minute:

| Operator | Sent to the API                     |
| -------- | ----------------------------------- |
| `$eq`    | `$gte` start and `$lt` end          |
| `$ne`    | `$or` of `$lt` start and `$gte` end |
| `$lt`    | `$lt` start                         |
| `$lte`   | `$lt` end                           |
| `$gt`    | `$gte` end                          |
| `$gte`   | `$gte` start                        |

`$null` and `$notNull`, other filters and values that aren't dates are sent as they are. An ISO value with seconds, for example from an older link, is read as its minute.

A page with a `datetime` filter must pass the URL filters and the same `options` through `toApiFilters` before each API call. The Content Manager list view does it in `ListViewPage`: it computes the options once with `useListViewFilterOptions` and passes them to both `toApiFilters` and its `Filters.Root`. The audit logs do it for the list and for the CSV export.

Days and minutes are the viewer's: the bounds are computed in the browser's time zone. The same link can match different entries for viewers in different time zones. A day with a daylight saving time change runs from midnight to midnight, not 24 hours.
