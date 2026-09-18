# Media Library Bulk Move (Unstable)

> Source: `tests/e2e/tests/media-library/future/bulk-move.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Move multiple selected items into a folder from the bulk action bar

**As a** content editor managing media **I want** to select multiple assets or a folder and move them into a destination folder together, with a confirmation step I can back out of **so that** I can reorganize my media library in one action.

### Acceptance Criteria

- **Given** a folder "Marketing team" exists and two files ("test-image-1.jpg" and "test-image-2.jpg") have been uploaded **When** I switch to table view and select both assets **Then** the bulk actions bar contains "2 items selected".
- **Given** the two assets are selected **When** I bulk-move the selection to "Marketing team" **Then** a "2 elements have been moved from Media Library to Marketing team" notification is shown **And** both assets are no longer visible in the current (root) list **And** the bulk actions bar is hidden with the selection cleared.
- **Given** the assets have been moved into "Marketing team" **When** I navigate into the "Marketing team" folder **Then** both "test-image-1.jpg" and "test-image-2.jpg" are visible there.
- **Given** folders "Destination" and "Nomad" both exist at the root **When** I select the "Nomad" folder in table view and bulk-move it to "Destination" **Then** the "Nomad" folder row is no longer visible at the root.
- **Given** "Nomad" has been moved into "Destination" **When** I expand "Destination" in the "Media library folders" sidebar navigation **Then** "Nomad" is shown nested under it.
- **Given** a single asset "test-image-1.jpg" is selected **When** I click "Move" in the bulk actions bar **Then** a "Move elements to" dialog is shown.
- **Given** the "Move elements to" dialog is shown **When** I click "Cancel" **Then** the dialog is no longer visible **And** the asset "test-image-1.jpg" remains visible **And** the bulk actions bar remains visible with the selection intact.
