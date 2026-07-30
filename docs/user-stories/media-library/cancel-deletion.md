# Media Library Cancel Deletion

> Source: `tests/e2e/tests/media-library/cancel-deletion.spec.ts`

## User Story: Cancel the remove-asset confirmation without deleting the asset

**As a** content editor managing media **I want** the Cancel button in the delete confirmation to abort deletion **so that** I do not accidentally remove an asset.

### Acceptance Criteria

- **Given** the Media Library **When** I click "Add new assets", select a file, and click "Upload 1 asset to the library" **Then** the dialog closes (stable media library shows no success toast).
- **Given** the asset "test-image.jpg" has been uploaded **When** I view the Media Library **Then** the asset is visible **And** can be opened by clicking its card.
- **Given** the asset "test-image.jpg" card is opened **When** the edit/Details dialog opens **Then** a "Delete" button is visible.
- **Given** the Details dialog is open **When** I click "Delete" **Then** a confirmation showing "Are you sure?" and a "Confirm" button is opened.
- **Given** the "Are you sure?" confirmation is shown **When** I click "Cancel" in the confirmation footer **Then** the "Are you sure?" content is dismissed.
- **Given** I cancelled the delete confirmation **When** I look at the Details dialog **Then** it stays open **And** the "Delete" button is still visible, confirming the asset was not deleted (regression test for issue #25190).
