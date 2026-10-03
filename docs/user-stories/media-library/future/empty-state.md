# Media Library Empty State (Unstable)

> Source: `tests/e2e/tests/media-library/future/empty-state.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: See a designed empty state when there are no assets, with a direct way to upload

**As a** content editor managing media **I want** a designed empty state (rather than a bare message) when the Media Library or a folder has no assets, with an "Add assets" button that opens the same upload flow as New > File upload **so that** I immediately understand there is nothing here yet and can start uploading without hunting for the upload entry point.

### Acceptance Criteria

- **Given** a fresh Media Library with no assets **When** I visit it **Then** "No assets yet" and "Get started by uploading assets or creating a folder." are shown.
- **Given** the empty state is shown **When** I click "Add assets" and choose a file in the file picker **Then** the upload succeeds **And**, after closing the upload progress dialog, "No assets yet" is no longer visible **And** "test-image.jpg" is visible.
- **Given** an empty folder "Empty folder" **When** I navigate into it **Then** "No assets yet" is shown **And** an "Add assets" button is visible.
