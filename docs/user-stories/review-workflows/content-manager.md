# Review Workflows in the Content Manager

> Source: `tests/e2e/tests/review-workflows/content-manager.spec.ts`

> Note: These behaviors are only tested in the Enterprise Edition (EE).

## User Story: Assign a document to a user and see it reflected in the list view

**As a** content manager / reviewer **I want** to assign a document to a user and see the assignment in the list view **so that** I know who is responsible for an entry.

### Acceptance Criteria

- **Given** the "West Ham post match analysis" entry is open and the "Assignee" combobox is visible **When** "editor testing" is selected as assignee **Then** "Assignee updated" is shown **And** the combobox value becomes "editor testing".
- **Given** the assignee has been set to "editor testing" **When** going back to the list view **Then** a gridcell "editor testing" is shown.
- **Given** the assignee has been set to "editor testing" **When** the entry is reopened **Then** the "Assignee" combobox still reads "editor testing".

## User Story: Change the review stage of a document and see it in the list view

**As a** content manager / reviewer **I want** to change a document's review stage and see it in the list view **so that** the workflow progress is visible.

### Acceptance Criteria

- **Given** the "West Ham post match analysis" entry is open and the "Review stage" combobox is visible **When** "In progress" is selected **Then** "Review stage updated" is shown **And** the combobox reads "In progress".
- **Given** the review stage has been set to "In progress" **When** going back to the list view **Then** a gridcell "In progress" is shown.
- **Given** the review stage has been set to "In progress" **When** the entry is reopened **Then** the "Review stage" combobox still reads "In progress".

## User Story: Change assignee from the preview view (unstable preview)

**As a** content manager / reviewer **I want** to change the assignee from the preview page and have it reflected in edit and list views **so that** I can manage assignments while previewing content.

### Acceptance Criteria

- This behavior is only tested when `STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR` is enabled.
- **Given** the preview for the "West Ham post match" Article is open **When** the assignee is set to "editor testing" **Then** "Assignee updated" is shown.
- **Given** the assignee was set to "editor testing" in the preview **When** the preview is closed **Then** the edit view's "Assignee" combobox reads "editor testing" **And** going back to the list view shows a gridcell "editor testing".

## User Story: Change review stage from the preview view (unstable preview)

**As a** content manager / reviewer **I want** to change the review stage from the preview page and have it reflected in edit and list views **so that** I can manage workflow stages while previewing.

### Acceptance Criteria

- This behavior is only tested when `STRAPI_FEATURES_UNSTABLE_PREVIEW_SIDE_EDITOR` is enabled.
- **Given** the preview for the "West Ham post match" Article is open **When** the stage is set to "In progress" **Then** "Review stage updated" is shown.
- **Given** the stage was set to "In progress" in the preview **When** the preview is closed **Then** the edit view's "Review stage" combobox reads "In progress" **And** going back to the list view shows a gridcell "In progress".
