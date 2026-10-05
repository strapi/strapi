# Bulk Publish Draft-Relations Warning

> Source: `tests/e2e/tests/content-manager/bulk-publish-draft-relations-warning.spec.ts`

## User Story: Warn when bulk publishing entries whose relations point only to draft targets

**As a** content editor **I want** a warning when I bulk publish entries whose relations reference not-yet-published entries **so that** I don't unknowingly publish content that links to draft-only data.

### Acceptance Criteria

- **Given** two "Relation lab" entries, each linked via a bidirectional many-to-many relation to a distinct draft-only "Relation target" entry **When** I select both entries in the list view and click "Publish" **Then** a "Publish entries" dialog appears **And** clicking its "Publish" button opens a "Confirmation" dialog warning that relations are "not published yet and might lead to unexpected behavior" **And** stating "2 relations out of 2 entries" **And** showing "Publish" and "Cancel" buttons.
- **Given** two "Relation lab" entries, each linked via an xToOne (manyToOne) relation to a distinct draft-only "Relation target" entry **When** I bulk-select and publish them **Then** the same "Confirmation" dialog warns about "2 relations out of 2 entries" not yet published.
- **Given** the draft-relations warning dialog is shown **When** I click "Cancel" **Then** the dialog closes without publishing.

## User Story: Do not warn when bulk publishing entries whose relations are all published

**As a** content editor **I want** no draft-relations warning when bulk publishing entries whose related content is already published **so that** I'm not interrupted by an irrelevant warning.

### Acceptance Criteria

- **Given** two "Relation lab" entries, each linked via a bidirectional many-to-many relation to a distinct already-published "Relation target" entry **When** I bulk-select and publish them **Then** a plain "Are you sure you want to publish these entries?" confirmation is shown, with no draft-relations warning text.
- **Given** two "Relation lab" entries, each linked via an xToOne (manyToOne) relation to a distinct already-published "Relation target" entry **When** I bulk-select and publish them **Then** the same plain confirmation appears, with no draft-relations warning text.
