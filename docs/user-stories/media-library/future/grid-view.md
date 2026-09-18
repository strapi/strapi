# Media Library Grid View (Unstable)

> Source: `tests/e2e/tests/media-library/future/grid-view.spec.ts`

> Note: These behaviors are only tested when the `UNSTABLE_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Switch between grid and table views

**As a** content editor managing media **I want** to toggle between grid and table views **so that** I can browse assets in my preferred layout.

### Acceptance Criteria

- **Given** grid view is active **When** I switch to table view **Then** grid view becomes inactive.
- **Given** table view is active **When** I switch back to grid view **Then** grid view becomes active again.

## User Story: Persist the view preference

**As a** content editor managing media **I want** my chosen view to persist across reloads **so that** I do not have to re-select it each visit.

### Acceptance Criteria

- **Given** I have switched to table view **When** I reload the page **Then** the view is still table view (grid view is not active).

## User Story: Display an uploaded file as a card in grid view

**As a** content editor managing media **I want** uploaded files shown as cards in grid view **so that** I can see thumbnails of my assets.

### Acceptance Criteria

- **Given** grid view and a file has been uploaded with the upload reaching success **When** I view the grid **Then** the "test-image" asset card is visible.
