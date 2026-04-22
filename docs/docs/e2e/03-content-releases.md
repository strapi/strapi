---
sidebar_position: 4
sidebar_label: Content Releases
---

# Content Releases

End-to-end coverage for the Content Releases feature, which lets editors group draft and unpublish actions together and publish them as a single, optionally scheduled, unit. All specs in this area are gated to the Enterprise Edition (EE) build.

## Overview

Content Releases is an EE-only plugin that sits alongside the Content Manager. It lets users organise entries from multiple collection and single types into a named release, optionally schedule it, edit or remove pending actions, and publish or unpublish every queued entry in one operation. These Playwright specs exercise the full editor journey: creating releases (scheduled and unscheduled), adding entries from list and edit views, grouping and reordering actions on the release details page, performing bulk additions from the Content Manager, surfacing upcoming releases on the homepage widget, and ensuring document status stays in sync once a release is published. Each spec runs against a freshly reset database (`with-admin` dataset) and skips automatically outside EE via `describeOnCondition`.

## Test specs

### `content-releases/document-status.spec.ts` — Document status synchronisation

**Purpose:** verifies that publishing a release correctly updates the draft/published status of the entries it contains in the Content Manager.

**Preconditions:**

- EE edition is enabled (`STRAPI_DISABLE_EE !== 'true'`).
- `sharedSetup` runs before each test with `login`, `resetFiles`, `resetAlways` and the `with-admin` dataset imported, ensuring full isolation between tests.
- `resetFiles` is invoked once after all tests finish.

**Scenarios covered:**

- `Releases - Document status` -> `should update the document status when a release is published`: publishes an article directly, then adds its draft sibling to the "Trent Crimm: The Independent" release, publishes the release, and asserts that the list view status badges and the edit view status flip between draft and published as expected.

### `content-releases/home-widgets.spec.ts` — Homepage upcoming releases widget

**Purpose:** validates the "Upcoming releases" homepage widget, checking that it lists both unscheduled and scheduled releases and that its status column reacts to newly added entries.

**Preconditions:**

- EE edition is enabled.
- Before each test the database is reset and seeded from `with-admin`, the admin navigates to `/admin` and logs in.

**Scenarios covered:**

- `Homepage - Content Releases Widgets` -> `a user should see the list of upcoming releases`: confirms the seeded "Trent Crimm: The Independent" release appears as "Not scheduled", creates a new release scheduled two hours into tomorrow, returns to the homepage and checks the widget shows it as "empty", then adds a Cat entry to that release and verifies the widget status updates to "blocked".

### `content-releases/release-details-page.spec.ts` — Release details page

**Purpose:** covers the individual release page, including adding entries of different kinds, editing and deleting a release, and manipulating the queued actions.

**Preconditions:**

- EE edition is enabled.
- Before each test the database is reset from `with-admin`, the user logs in, navigates to the Releases list, and opens the "Trent Crimm: The Independent" release (URL matches `/admin/plugins/content-releases/*`).
- A shared `addEntryToRelease` helper opens the "Add to release" dialog, asserts the default "publish" radio is checked and the Continue button is disabled until a release is selected, then submits and waits for the "Entry added to release" toast.

**Scenarios covered:**

- `Release page` -> `A user should be able to add collection-type and single-type entries to a release and publish the release`: adds a collection-type entry (Author "Led Tasso") and a single-type entry (Upcoming Matches) to the release, publishes the release, and asserts that the publish button, edit/delete menu and per-entry action toggles disappear while a "This entry was published." cell becomes visible.
- `Release page` -> `A user should be able to edit and delete a release`: renames the release to "Trent Crimm: Independent" via the edit dialog, then deletes it through the edit/delete menu and confirms the redirect back to `/admin/plugins/content-releases` no longer shows the entry.
- `Release page` -> `A user should be able to change the entry groupings, update an entry's action, remove an entry from a release, and navigate to the entry in the content manager`: switches grouping from content type to Actions, toggles the action radio on the "West Ham post match analysis" row so it moves to the top of its group, opens the row menu to jump into the Content Manager edit view, returns to the release, and removes the entry via "Remove from release".

### `content-releases/releases-page.spec.ts` — Releases list page and bulk actions

**Purpose:** exercises the main Releases list page, including creating scheduled and unscheduled releases, switching between Pending and Done tabs, and bulk-adding entries from the Content Manager.

**Preconditions:**

- EE edition is enabled.
- Before each test `sharedSetup` runs with `login`, `resetFiles`, `resetAlways` and the `with-admin` dataset to guarantee isolation.
- `resetFiles` runs once after all tests complete.

**Scenarios covered:**

- `Releases page` -> `A user should be able to create a release without scheduling it and view their pending and done releases`: checks the seeded "Trent Crimm: The Independent" release is visible on the Pending tab, switches to the Done tab to confirm "Nate: A wonder kid" is listed, then opens the "New release" dialog, unchecks "Schedule release", creates "The Diamond Dogs", and verifies the redirect to the new release page and its presence back on the list.
- `Releases page` -> `A user should be able to create a release with scheduling info and view their pending and done releases`: opens the "New release" dialog, fills the name, picks tomorrow's date and the 08:00 time slot, submits, and asserts the redirect to the release page and the release appearing on the Releases list.
- `Releases page` -> `A user should be able to perform bulk release on entries`: split into two `test.step` blocks. The first creates an unscheduled "The Diamond Dogs" release, navigates into the Article collection type, selects all entries, uses the "Add to release" bulk action with the "unpublish" action selected, and waits for the "Successfully added to release." toast. The second opens the list-view release column button ("1 release") and confirms "The Diamond Dogs" is shown there.
- `Releases page` -> `Should not show "add to release" bulk action for content types without draft & publish enabled`: bulk-publishes all articles, disables Draft & Publish for the Article content type via the Content-Type Builder (confirming the alert dialog and waiting for the server restart), then returns to the Article list, selects all entries and asserts that the "Add to release" bulk action button is no longer rendered.
