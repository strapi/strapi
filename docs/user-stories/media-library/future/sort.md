# Media Library Sort (Unstable)

> Source: `tests/e2e/tests/media-library/future/sort.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Sort assets alphabetically in either direction

**As a** content editor managing media **I want** to sort the asset list alphabetically, ascending or descending **so that** I can find assets by name regardless of upload order.

### Acceptance Criteria

- **Given** two files ("test-image-1.jpg" and "test-image-2.jpg") have been uploaded **When** I switch to table view **Then** the sort menu trigger reads "Most recent updates" by default.
- **Given** the default sort is active **When** I pick "A to Z" **Then** the rows read, in order, "test-image-1.jpg" then "test-image-2.jpg" (the alphabetical sort replaces the date sort — they are mutually exclusive).
- **Given** "A to Z" is active **When** I pick "Z to A" **Then** the row order inverts to "test-image-2.jpg" then "test-image-1.jpg".

## User Story: Choose how folders are ordered relative to files when sorting

**As a** content editor managing media **I want** to choose whether folders are always shown first or mixed alphabetically among files **so that** I can control the list layout to suit how I work.

### Acceptance Criteria

- **Given** a folder "test-image-15" and two files ("test-image-1.jpg", "test-image-2.jpg", whose names alphabetically sandwich the folder's name) **When** I sort "A to Z" with the default "Folders on top" rule **Then** the first row is "test-image-15" regardless of alphabetical order.
- **Given** the "A to Z" sort is active **When** I switch the rule to "Mixed with files" **Then** the rows read, in order, "test-image-1.jpg", "test-image-15", "test-image-2.jpg" (the folder slots in alphabetically among the files).

## User Story: Restore the sort order from the URL after a reload

**As a** content editor managing media **I want** an applied sort order to persist in the URL and be restored on reload **so that** I don't lose my chosen ordering if the page refreshes or the link is shared.

### Acceptance Criteria

- **Given** "test-image-1.jpg" has been uploaded **When** I pick "Oldest uploads" **Then** the page URL contains "sort=createdAt:ASC" (URL-encoded as "sort=createdAt%3AASC").
- **Given** the "Oldest uploads" sort is applied and reflected in the URL **When** I reload the page **Then** the sort menu trigger reads "Oldest uploads".
