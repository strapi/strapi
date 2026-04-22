---
sidebar_position: 7
sidebar_label: Media Library
---

# Media Library

End-to-end Playwright coverage for the Strapi admin Media Library, spanning asset uploads, folder management, grid/table views, and asset detail interactions. The `future/` subfolder contains specs for the revamped Media Library experience gated behind the `UNSTABLE_MEDIA_LIBRARY` environment flag — each of those specs uses `describeOnCondition(process.env.UNSTABLE_MEDIA_LIBRARY === 'true')` so they only run when the future flag is enabled.

## Overview

The Media Library is Strapi's built-in asset management surface, letting administrators upload files, organise them into folders, preview their metadata, and manage their lifecycle. These end-to-end tests exercise the library through the admin UI, covering both the stable experience (regression scenarios on the shipped Media Library) and the in-progress "future" Media Library rewrite (new drawer-based asset details, redesigned upload progress dialog, improved folder creation flow, and grid/table view toggling). Every spec resets the database from the `with-admin` snapshot and logs in before each test so scenarios start from a consistent, authenticated state.

## Test specs

### Root

#### `media-library/cancel-deletion.spec.ts` — Cancel asset deletion

**Purpose:** Regression test ensuring that cancelling the asset-removal confirmation dialog does not delete the asset (covers [strapi/strapi#25190](https://github.com/strapi/strapi/issues/25190)).

**Preconditions:**

- Database reset from `with-admin` and local upload files reset via `resetFiles()`.
- User logged into the admin panel.

**Scenarios covered:**

- `Media Library` > `Cancel deletion` > `as a user I want to cancel the remove-asset confirmation without deleting the asset`: navigates to the Media Library, uploads `test-image.jpg`, opens the asset's details dialog, triggers the delete flow, clicks Cancel on the "Are you sure?" confirmation, and asserts the confirmation closes while the asset's Edit dialog and Delete button remain visible (i.e. the asset is preserved).

### future

#### `media-library/future/asset-details.spec.ts` — Asset details drawer

**Purpose:** Verifies that clicking an asset in either the table or grid view opens the new asset details drawer with the correct file information.

**Preconditions:**

- `UNSTABLE_MEDIA_LIBRARY=true` feature flag enabled (otherwise the suite is skipped).
- Database reset from `with-admin` and user logged into the admin panel.

**Scenarios covered:**

- `Media Library - Asset Details Drawer` > `should open drawer and display file info when clicking an asset`: switches to table view, clicks `ted_lasso_profile.jpeg`, asserts the details drawer displays "File info" and the file name, closes the drawer, switches to grid view, clicks the `coach_beard_profile.jpg` card, and re-asserts the drawer content.

#### `media-library/future/file-upload.spec.ts` — File upload flows

**Purpose:** Covers the various ways assets can be uploaded into the future Media Library and validates the upload-progress dialog behaviour.

**Preconditions:**

- `UNSTABLE_MEDIA_LIBRARY=true` feature flag enabled.
- Database reset from `with-admin` and user logged into the admin panel.

**Scenarios covered:**

- `File Upload` > `should upload a file and show progress dialog with success`: uploads a single file through the file picker and asserts the progress dialog appears, completes successfully, and can be dismissed.
- `File Upload` > `should upload multiple files and show progress dialog with success`: uploads two files, asserts the progress dialog's multi-file success message ("2 files uploaded successfully"), and closes the dialog.
- `File Upload` > `should display uploaded file in the assets table view`: uploads a file while in table view and asserts the resulting row is visible in the assets table.
- `File Upload` > `should upload a file via drag and drop`: uploads a file via drag-and-drop into the drop zone and asserts the uploaded asset appears in the table view.
- `File Upload` > `should upload a file from URL and show progress dialog with success`: uploads from a remote URL (`https://picsum.photos/200`) and asserts the progress dialog reflects a successful upload before closing it.

#### `media-library/future/folder-creation.spec.ts` — Folder creation flows

**Purpose:** Exercises the redesigned folder-creation dialog, including root-level folders, subfolders, cancellation, duplicate-name validation, and form reset behaviour.

**Preconditions:**

- `UNSTABLE_MEDIA_LIBRARY=true` feature flag enabled.
- Database reset from `with-admin` and user logged into the admin panel.

**Scenarios covered:**

- `Media Library - Folder Creation` > `should create a folder from the root`: opens the create-folder dialog at the root, asserts the title reads "New folder in Home", creates "Test Folder", and asserts it appears as a card in grid view.
- `Media Library - Folder Creation` > `should create a subfolder inside an existing folder`: creates a "Parent Folder", navigates into it, opens the create-folder dialog, asserts the title reflects the parent ("New folder in Parent Folder"), creates "Sub Folder", and asserts the subfolder card is visible.
- `Media Library - Folder Creation` > `should cancel folder creation`: fills in a folder name, clicks Cancel, and asserts the dialog closes and no folder with that name is rendered.
- `Media Library - Folder Creation` > `should show inline error for duplicate folder name`: creates a folder named "Duplicate", attempts to create another with the same name, and asserts an inline "already exists" error is shown inside the dialog.
- `Media Library - Folder Creation` > `should reset form when dialog is reopened`: fills and cancels the dialog, reopens it, and asserts the input is empty with no visible alert, confirming the form resets cleanly.

#### `media-library/future/grid-view.spec.ts` — Grid view and view toggle

**Purpose:** Validates the grid/table view toggle behaviour and that uploaded assets render as cards in grid view.

**Preconditions:**

- `UNSTABLE_MEDIA_LIBRARY=true` feature flag enabled.
- Database reset from `with-admin` and user logged into the admin panel.

**Scenarios covered:**

- `Media Library - Grid View` > `View Toggle` > `should switch between grid and table views`: toggles to table view and asserts grid view is inactive, then toggles back and asserts grid view is active again.
- `Media Library - Grid View` > `View Toggle` > `should persist view preference`: switches to table view, reloads the page, and asserts the table view is retained across reloads.
- `Media Library - Grid View` > `Grid Display` > `should display uploaded file as card in grid view`: ensures grid view is active, uploads `test-image.jpg`, and asserts the asset card is visible in the grid.
