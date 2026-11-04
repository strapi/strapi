---
title: Release details page
description: 'Documentation of the release details page and its functionality.'
tags:
  - tech-design
  - frontend
status: stub
---

### Overview:

The release details page allows users with appropriate permissions to do the following:

#### Group entries:

Entries in a release can be grouped by the following options:

- Content-Types: Group all entries with the same content type together
- Locales: Group all entries with the same locale together.
- Actions: Group all entries with the same action (publish/unpublish) together.

The tabs (All, Ready / Not ready or Released / Skipped) and the grouping live in the URL (`filter`, `groupBy`). Changing them replaces the current history entry, so Back leaves the page instead of stepping through the tabs.

#### Edit a release:

Until a release has run, a "three dot" button in the header gives access to a menu with an "Edit" option, enabled if the user has the `plugin::content-releases.update` permissions.
The Edit option opens a side panel, enabling users to modify the release name, schedule and release mode. The name must be non-empty and unique among pending releases.

#### Delete a release:

The same menu has a "Delete" option, enabled if the user has the `plugin::content-releases.delete` permissions. Selecting it opens a confirmation modal. A release whose run failed (status `failed`) released nothing, so the header shows a "Delete" button for it instead, with the same permission and modal. A release that ran (`done`, `partial`) can't be deleted.

#### Create a release from skipped entries:

Once a release has run as partial or failed (except a release that failed before the upgrade, which the API refuses too), a "Create release from skipped entries" button appears in the header. It requires the `plugin::content-releases.create` and `plugin::content-releases.create-action` permissions and is hidden when every skipped entry has since been deleted. It opens a side panel listing the entries carried over to the new release, with the release mode defaulting to "Release all ready items" and the date left empty: the user picks one or ticks "I don't have a release date yet".

#### View Entry Status

Each entry within a release shows a status badge (`components/ReleaseActionStatus.tsx`):

- In a planned release, "Ready" or "Not ready". An unpublish is always ready: nothing is checked.
- In a release that ran, "Done", "Skipped", or "Unknown" for a release that failed before the upgrade.

In a release that ran, the action column shows the action as text, with an upload icon for a publish and a download icon for an unpublish, instead of the publish/unpublish switch.

"Not ready" and "Skipped" open the reason drawer (`components/EntryReasonDrawer.tsx`). Its badge names the reason ("Skipped: Validation error"), or only "Not ready" / "Skipped" when the entry has several kinds of issue (a failed field and a missing review stage, say). It lists the reason stored with the action (`reason`) in one box, under the number of issues, one card per issue: each field that failed, by a name built from its path and what's wrong in plain words (`utils/fieldErrors.ts`), the review stage the entry is missing, or the name of the error a run failed on, with its message when the server kept it (an `ApplicationError`'s). A held or missed entry's card is the sentence that explains it. A held entry also lists, under "Held back by", the entries that held back its `all_or_nothing` run (the `blocking` filter, the first 5, then a count of the rest); each opens its own reason in the drawer. For a release that ran, a note dates the reasons: by the run, or by the schedule for one that froze without running (`failureReason`), with no date when that one had no schedule. The date reads as in the page header (`getReleaseDateParts` in `utils/time.ts`: the release's timezone, a 24-hour time and the UTC offset). A planned release's reasons are live, so it has no note. Previous and Next step through the entries that have a reason, in the table's order. The first 100 load, then twice as many each time more are needed: when Next is pressed on the last one loaded, or when the opened row isn't among them, up to 500. An opened row past the first 500 steps through the table's rows only. "Go to entry" opens the entry in the Content Manager with its validation errors shown, for a user allowed to read it.

In a planned release, the entry's "three dots" menu also has an "Edit entry" link. In a release that ran, the row's edit icon opens the entry, as there's nothing to remove; it shows for a user who can read the entry's content type, in the action's locale for a localized one. Within the CM edit view, users can resolve any identified errors. Saving, publishing or unpublishing the entry there refetches the release, so its status is up to date when the user comes back; the "Refresh" button re-checks every entry on demand.

#### Publish a release:

To execute the release of a content release, users can simply click on the "Publish" button (shown if you have the "plugin::content-releases.publish" permission). It's disabled while the release is empty or blocked, as running it would release nothing; a tooltip on it, reachable from the keyboard, says why ("This release is empty.", or for a blocked release what its release mode needs). A release that reads ready may still be refused if an entry changed since it was checked: the notification shows why, and the release reads blocked after the refetch.

The notification after a run follows its outcome: a success when every entry was released, a warning with the counts ("Released 8 of 10 entries, 2 skipped") for a partial run, and a danger notification saying nothing was released, with the run's error, for a failed run (the API answers with the frozen release in the error's details, which tells it from a refused publish). For a failed `all_or_nothing` run, the page first asks for the run's `blocking` entries and names the first ("Nothing was released, held back by Partner feed 1: …"); without one, e.g. a run that failed outside any entry, the notification names none.

#### Header:

The header subtitle joins its parts with " • ". A planned release shows its number of entries and, if scheduled, "Scheduled for {date}". A release that ran shows "Released on {date}" (its `releasedAt`, in the release's timezone or the browser's when unscheduled), then what the run released and skipped. A run that released nothing (every entry skipped) shows "Ran on {date} • Nothing was released • N skipped" instead. A release that missed its schedule or failed before the upgrade never ran: it shows its scheduled time, never the time it was frozen, and no date when it wasn't scheduled.
