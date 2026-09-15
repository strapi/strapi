# Document Status in Content Releases

> Source: `tests/e2e/tests/content-releases/document-status.spec.ts`

## User Story: Publishing a release updates the document status

**As a** content manager **I want** the document status to reflect the release outcome **so that** I can trust the list view to show which version of an entry is currently live.

> Note: This behavior is only available in the Enterprise Edition (EE).

### Acceptance Criteria

**Scenario: Manually publishing an article updates its status in the list view**

- **Given** I am on the Article list view
- **When** I manually publish the "West Ham post match analysis" article and return to the Article list view
- **Then** the first row shows a `published` status
- **And** the second row shows a `draft` status

**Scenario: Add a draft entry to an existing release**

- **Given** I am on the Article list view with a draft entry
- **When** I open the row's "Row actions" menu, choose "Add to release", select the release "Trent Crimm: The Independent" in the "Select a release" combobox, and click "Continue"
- **Then** the entry is added to the release

**Scenario: Publishing a release updates the document statuses**

- **Given** the "Trent Crimm: The Independent" release contains the draft entry
- **When** I open the release from the Releases page and click "Publish"
- **Then** the release heading remains visible
- **And** returning to the Article list view shows the first row as `draft` and the second row as `published`, confirming the statuses changed as a result of the release
- **And** opening the "West Ham post match analysis" entry shows a "Draft" status
