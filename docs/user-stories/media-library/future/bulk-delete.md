# Media Library Bulk Delete (Unstable)

> Source: `tests/e2e/tests/media-library/future/bulk-delete.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Delete multiple selected items from the bulk action bar

**As a** content editor managing media **I want** to select multiple assets or folders and delete them together, with a confirmation step I can back out of **so that** I can clean up my media library efficiently without accidental data loss.

### Acceptance Criteria

- **Given** two files ("test-image-1.jpg" and "test-image-2.jpg") have been uploaded **When** I switch to table view and select both assets **Then** the bulk actions bar becomes visible and contains "2 items selected".
- **Given** the two assets are selected **When** I confirm the bulk delete **Then** both assets are no longer visible in the list **And** the selection is cleared so the bulk actions bar is hidden.
- **Given** a folder "Doomed" has been created **When** I switch to table view and select that folder **Then** the bulk actions bar contains "1 item selected".
- **Given** the folder "Doomed" is selected **When** I confirm the bulk delete **Then** the "Doomed" folder row is no longer visible **And** the bulk actions bar is hidden.
- **Given** a single asset "test-image-1.jpg" is selected **When** I click "Delete" in the bulk actions bar **Then** a "Delete 1 item?" confirmation is shown.
- **Given** the "Delete 1 item?" confirmation is shown **When** I click "Cancel" **Then** the asset "test-image-1.jpg" remains visible **And** the bulk actions bar remains visible with the selection intact.
