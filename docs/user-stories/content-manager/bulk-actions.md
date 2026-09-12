# Bulk Actions

> Source: `tests/e2e/tests/content-manager/bulk-actions.spec.ts`

## User Story: Disable bulk actions for a content type

**As a** content manager **I want** to disable bulk actions on a content type from its view configuration **so that** editors can no longer perform bulk operations (like Publish) on that content type's list view.

### Acceptance Criteria

- **Given** the Article list view **When** I select all entries via the "Select all entries" checkbox **Then** a "Publish" bulk action button is shown.
- **Given** I am in the Article list view **When** I open "View settings" and click "Configure the view" **Then** the view configuration opens.
- **Given** the view configuration **When** I uncheck "Enable bulk actions" and save **Then** a "Saved" confirmation appears.
- **Given** bulk actions have been disabled **When** I return to the list view and select all entries again **Then** the "Publish" bulk action button is no longer visible.
