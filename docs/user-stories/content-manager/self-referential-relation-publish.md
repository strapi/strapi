# Self-Referential Relation Publish

> Source: `tests/e2e/tests/content-manager/self-referential-relation-publish.spec.ts`

## User Story: Keep a self-referential relation visible after publishing, without a manual refresh

**As a** content editor **I want** a document's relation field that points at itself to stay visible in the edit view immediately after I publish **so that** I don't need to refresh the page to trust what I see, and so that I can tell a front-end display issue apart from actual data loss.

### Acceptance Criteria

- **Given** a new `Dog` entry named "Rex", saved as a draft **When** I set its `related` relation field to point at itself ("Rex") **Then** a "Rex" relation chip is shown.
- **Given** the self-relation is set **When** I click "Save" **Then** a "Saved Document" confirmation appears **And** the "Rex" relation chip remains visible.
- **Given** the saved draft with a self-relation **When** I click "Publish" (without reloading the page) **Then** a "Published Document" confirmation appears **And** the "Rex" relation chip stays visible without a manual refresh.
- **Given** the published entry, still unrefreshed **When** I reload the page **Then** the "Rex" relation chip is still visible, confirming the self-relation was actually persisted server-side and not just shown by a stale front-end cache.
