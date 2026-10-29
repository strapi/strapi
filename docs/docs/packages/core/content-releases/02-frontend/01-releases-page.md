---
title: Releases page
description: 'Documentation of the content releases page user interface.'
tags:
  - tech-design
  - frontend
status: stub
---

### Overview

The releases page lists every release in one paginated table, sorted by last update (most recent first). Its columns are name, status, schedule, entries and release mode; clicking a row opens the release details page. The header subtitle shows the number of releases matching the applied filters (every release without filters).

The schedule column shows when a release runs or ran: its `releasedAt` once it ran, otherwise its `scheduledAt`, or "Not scheduled". A release that froze without running (`failureReason` set: it missed its schedule or failed before the upgrade) shows its `scheduledAt`, as its `releasedAt` is only when it froze; without a schedule it shows "Not scheduled". The relative label above the date ("in 2 days", "yesterday") counts days by calendar day in the viewer's timezone, not by elapsed 24-hour periods.

The list, the release details and its entries refetch when content changes in the Content Manager (save, discard, delete) and when an entry's review stage or a review workflow changes, as these change which entries are ready. The review-workflows mutations invalidate the `ReviewWorkflowStages` tag, which the release queries provide: extending those mutations from `services/release.ts` would depend on the plugins' load order.

#### Filters

A "Filters" button above the table opens the admin's list filters popover (`Filters` from `@strapi/admin`), with four fields:

- **Status**: the release's stored `status` (`is` / `is not`).
- **Release mode**: `allow_partial` or `all_or_nothing` (`is` / `is not`).
- **Scheduled for**: the release's `scheduledAt`. "Not scheduled" is `is null`.
- **Released on**: the release's `releasedAt`, set when it ran. "Not released yet" is `is null`.

The two date fields use `ScheduleFilterInput`: a date, and an optional time. A date alone is stored in the URL as `YYYY-MM-DD` and matches that whole day; a date and a time is stored as an ISO string and matches that minute. Stored dates have seconds and milliseconds, so `utils/scheduleFilters` turns each date filter into bounds before calling the API: `is` becomes `$gte` start and `$lt` end, `is not` an `$or` outside them, and before/after the matching bound. Days and times are the viewer's, as in the pickers, and the time picker shows times in the admin locale's format. A hand-edited URL setting several operators on one date filter keeps all of them, combined with `$and`; a date that doesn't exist (e.g. `2026-13-45`) is sent as it is. The date tags show the value through the filter's `formatValue`; the status and release mode tags show the option's label.

Filters live in the URL as `filters[$and]`, like the Content Manager list view, and combine with each other. Applied filters show as removable tags; "Clear all" next to the tags, or "Clear filters" in the empty state, removes them all. A `filters[releasedAt]` left in the URL by the old Pending/Done tabs is ignored, and so is a `filters[$and]` that isn't a list.

#### Sort

A "Sort" menu on the right of the filter bar sets the `sort` URL param: most recent updates (`updatedAt:desc`, the default), oldest updates, most recently created, and name A to Z or Z to A. Changing the sort keeps the applied filters and goes back to the first page; adding or clearing filters and changing page keep the sort. There is no schedule sort: releases without a date would land first or last depending on the database. A sort set in the URL that the menu doesn't offer is still sent to the API; the menu then reads just "Sort".

#### New Release Creation:

If a user has the `plugin::content-releases.create` permission, a 'New release' button will be visible in the header. Clicking the button opens a side panel with the release name, its schedule (date, time and timezone, or "I don't have a release date yet") and its release mode. The name of a pending release must be unique. Once created, the user is taken to the new release. If the API refuses it, e.g. for a name already in use, its error message shows in the notification.

#### License limits

If the user reaches the limit of maximum pending releases defined on their license then the 'New release' button is disabled and a banner is displayed to inform the user.
