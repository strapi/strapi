# Media Library Filters (Unstable)

> Source: `tests/e2e/tests/media-library/future/filters.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Filter assets by type, hiding folders for non-folder values

**As a** content editor managing media **I want** to filter the list by asset Type **so that** I can narrow the view to a particular kind of media without folders cluttering the results.

### Acceptance Criteria

- **Given** a folder "a-folder" and an uploaded image "test-image-1.jpg" **When** I filter by Type "Picture" **Then** exactly one filter badge is shown, containing "Type" **And** "test-image-1.jpg" remains visible **And** "a-folder" is no longer visible.
- **Given** the Type "Picture" filter badge is applied **When** I remove the "Type" filter badge **Then** "a-folder" becomes visible again.

## User Story: Filter assets by a creation date preset and flip the condition

**As a** content editor managing media **I want** to filter by a "Creation date" preset and flip its condition between "within the last" and "not within the last" **so that** I can find assets uploaded recently or exclude them.

### Acceptance Criteria

- **Given** "test-image-1.jpg" was just uploaded **When** I filter by Creation date "1 week ago" **Then** "test-image-1.jpg" remains visible (it falls within the last week).
- **Given** the Creation date "1 week ago" filter is applied **When** I flip its condition from "within the last" to "not within the last" on the filter badge **Then** "No items matched current filters" is shown.
- **Given** the filters produce no matches **When** I click "Clear filters" **Then** "test-image-1.jpg" is visible again.

## User Story: Restore filters from the URL after a reload

**As a** content editor managing media **I want** an applied filter to persist in the URL and be restored on reload **so that** I don't lose my filtered view if the page refreshes or the link is shared.

### Acceptance Criteria

- **Given** "test-image-1.jpg" has been uploaded **When** I filter by Creation date "1 week ago" **Then** the page URL contains "filters=".
- **Given** the Creation date filter is applied and reflected in the URL **When** I reload the page **Then** exactly one filter badge is shown **And** it contains "1 week ago".
