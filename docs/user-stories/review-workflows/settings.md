# Review Workflows Settings

> Source: `tests/e2e/tests/review-workflows/settings.spec.ts`

> Note: These behaviors are only tested in the Enterprise Edition (EE).

## User Story: Create a new workflow with three stages

**As a** content manager / reviewer **I want** to create a workflow with multiple named, colored stages associated to a content type **so that** I can model my review process.

### Acceptance Criteria

- **Given** the user is on Settings > Review Workflows **When** "Create new workflow" is clicked **Then** the creation form opens.
- **Given** the creation form is open **When** the workflow is named "Articles", associated to the "Author" content type, and three stages are added with names and colors Draft (Blue), Review (Lilac), Published (Green), then saved **Then** "Created workflow" is shown.
- **Given** the "Articles" workflow is associated to the "Author" content type **When** an Author entry ("Ted Lasso") is opened **Then** the "REVIEW WORKFLOWS" panel is shown with "Assignee" and "Review stage" comboboxes **And** the "Review stage" combobox lists the "Review" and "Published" stage options.

## User Story: Edit an existing workflow

**As a** content manager / reviewer **I want** to rename a workflow and add a stage **so that** I can adjust an existing review process.

### Acceptance Criteria

- **Given** the "Default" workflow is open **When** it is renamed to "Updated Workflow", a new stage "New Stage" is added with color Yellow, and the workflow is saved **Then** "Updated Workflow" is shown.
- **Given** the workflow has been saved **Then** the page heading shows "Updated Workflow" **And** the "New Stage" region is visible.

## User Story: Set a required stage for publishing

**As a** content manager / reviewer **I want** to require a specific stage before an entry can be published **so that** content cannot be published until it has been reviewed.

### Acceptance Criteria

- **Given** a "Publish Workflow" associated to "Author" with stages Draft (Blue), Review (Lilac), Done (Green) is being created **When** the "Required stage for publishing" is set to "Done" and the workflow is saved **Then** "Created workflow" is shown **And** the required-stage combobox reads "Done".
- **Given** an Author entry ("Ted Lasso") has not reached the required stage **When** publishing is attempted **Then** "Entry is not at the required stage to publish" is shown.
- **Given** the Author entry is below the required stage **When** the "Review stage" is changed to "Done" **Then** "Review stage updated" is shown.
- **Given** the Author entry is at the required "Done" stage **When** publishing is attempted **Then** it succeeds, showing "Published document".
