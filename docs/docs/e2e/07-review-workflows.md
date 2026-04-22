---
sidebar_position: 8
sidebar_label: Review Workflows
---

# Review Workflows

End-to-end coverage for the review-workflows feature, which lets editorial teams organise content through custom stages and assignees. Review workflows is an Enterprise Edition (EE) feature, so each spec short-circuits on Community Edition via `describeOnCondition(edition === 'EE')`.

## Overview

The review-workflows specs exercise the three surfaces where the feature is visible to administrators and editors: the workflow configuration screen under Settings, the per-document controls inside the Content Manager (including the Preview side editor), and the "assigned to me" widget on the admin Home page. Every spec shares the same preconditions — the database is reset and reseeded from the `with-admin` data transfer fixture, then a session is established through the shared `login` helper — so the scenarios can rely on a deterministic starting state that includes a default workflow, an administrator account and an `editor testing` user to assign work to.

## Test specs

### `review-workflows/content-manager.spec.ts` — Content Manager integration

**Purpose:** verifies that assignee and review-stage changes made from the Content Manager edit view and the Preview side editor propagate to the list view and persist across re-fetches.

**Preconditions:**

- Runs only when the current edition is EE.
- The database is reset and reseeded from the `with-admin` fixture before each test.
- The tester is signed in through the shared `login` helper and starts at `/admin`.
- The nested "Unstable Preview" group additionally requires the `STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR` environment variable to be `true`.

**Scenarios covered:**

- `content-manager` -> `I want to assign a document to a user and see this update in the list-view afterwards`: opens the "West Ham post match analysis" article, sets the Assignee combobox to `editor testing`, confirms the success toast, then navigates back to the list view to check the assignee cell and re-opens the entry to confirm the value was persisted.
- `content-manager` -> `I want to change the stage of a document and see this update in the list-view afterwards`: opens the same article, changes the Review stage combobox to `In progress`, checks the success toast, and verifies the new stage appears in the list view and survives a round-trip back into the edit view.
- `content-manager` -> `Unstable Preview` -> `I want to change the assignee of a document from preview and see this change in the edit and list views`: opens the Article, launches the preview side editor, updates the Assignee to `editor testing`, then closes preview and walks through the edit and list views to confirm both reflect the change.
- `content-manager` -> `Unstable Preview` -> `I want to change the stage of a document from preview and see this change in the edit and list views`: mirrors the previous scenario for the Review stage combobox, setting the stage to `In progress` inside the preview panel and asserting it is visible in both the edit view and list view once preview is closed.

### `review-workflows/home.spec.ts` — Home page "assigned to me" widget

**Purpose:** confirms that assigning a document to the current user in the Content Manager causes that document to appear in the "Assigned to me" widget on the admin home page.

**Preconditions:**

- Runs only when the current edition is EE.
- The database is reset and reseeded from the `with-admin` fixture before each test.
- The tester is signed in through the shared `login` helper and starts at `/admin`.

**Scenarios covered:**

- `Home` -> `a user should see the last entries assigned to them`: checks that the "Assigned to me" widget is visible on the home page, navigates to the Article collection, opens the West Ham entry and assigns it to `test testing` (the logged-in user), returns to home, and asserts the first row of the widget shows the West Ham entry together with a `draft` status cell.

### `review-workflows/settings.spec.ts` — Workflow settings administration

**Purpose:** covers the administrative lifecycle of workflows under Settings -> Review Workflows, including creating a multi-stage workflow, editing an existing one and configuring a stage that is required before a document can be published.

**Preconditions:**

- Runs only when the current edition is EE.
- The database is reset and reseeded from the `with-admin` fixture before each test.
- The tester is signed in through the shared `login` helper and starts at `/admin`.

**Scenarios covered:**

- `settings` -> `as a user I want to be able to create a new workflow with three stages`: navigates to Settings -> Review Workflows, creates an `Articles` workflow associated with the `Author` content type, adds Draft (Blue), Review (Lilac) and Published (Green) stages, saves, then opens an Author entry (`Ted Lasso`) to confirm the Review Workflows panel, Assignee and Review stage comboboxes are visible and that the new stages are selectable.
- `settings` -> `as a user I want to be able to edit an existing workflow`: opens the seeded `Default` workflow, renames it to `Updated Workflow`, adds a new `New Stage` (Yellow) stage, saves, and verifies the heading and new stage region are present after reload.
- `settings` -> `as a user I want to be able to set a required stage for publishing`: creates a `Publish Workflow` associated with `Author` with Draft, Review and Done stages, sets `Done` as the required stage for publishing, opens the `Ted Lasso` Author entry, attempts to publish while still in the Draft stage to assert the "Entry is not at the required stage to publish" error, moves the stage to `Done`, and then confirms publishing succeeds with the "Published document" confirmation.
