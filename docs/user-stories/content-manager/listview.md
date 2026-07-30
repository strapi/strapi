# List View

> Source: `tests/e2e/tests/content-manager/listview.spec.ts`

## User Story: Filter entries by a field

**As a** content editor **I want** to filter the list view by a field value **so that** I can find specific entries quickly.

### Acceptance Criteria

- **Given** the Article list view **When** I open "Filters", select the "documentId" field, enter a documentId value, and add the filter **Then** the applied filter chip "documentId is <value>" is shown **And** the grid shows exactly 2 rows (1 header row plus the 1 matching Article).

## User Story: Filter by Draft status

**As a** content editor **I want** to filter entries by "Draft (never published)" status **so that** I see only draft entries.

### Acceptance Criteria

- **Given** the Article list view **When** I open "Filters", choose the "Status" field, select "Draft (never published)", and add the filter **Then** the applied filter chip "Status is draft" is shown **And** the grid shows 3 rows (2 draft articles plus 1 header) and 2 "Draft" status cells.

## User Story: Filter by Published status

**As a** content editor **I want** to filter entries by "Published (all)" status **so that** I see only published entries.

### Acceptance Criteria

- **Given** the Article list view **When** I bulk-publish all (2) Article entries **Then** both show a "published" status cell.
- **Given** the entries are published **When** I apply the "Status" = "Published (all)" filter **Then** the chip "Status is published" is shown **And** the grid shows 3 rows (2 published plus 1 header) and 2 "published" status cells.

## User Story: Filter by Published when nothing is published

**As a** content editor **I want** a clear empty state when filtering by published status with no published entries **so that** I know there is no matching content.

### Acceptance Criteria

- **Given** 2 draft articles and none published **When** I apply the "Status" = "Published (all)" filter **Then** the chip "Status is published" is shown **And** a "No content found" message is displayed.

## User Story: Navigate to the list view and see entries

**As a** content editor **I want** to reach a content type's list view **so that** I can see its entries and start creating new ones.

### Acceptance Criteria

- **Given** the admin panel **When** I click "Content Manager" **Then** the Article list view opens **And** the page title is "Article | Strapi" **And** the "Article" heading and a "Create new entry" link are visible.

## User Story: Paginate entries

**As a** content editor **I want** entries to paginate **so that** large lists are split across pages I can navigate.

### Acceptance Criteria

- **Given** the Author list view **When** the page fits **Then** all 3 draft entries are shown with no "Next page" link.
- **Given** the Author list view **When** I set `pageSize=2` in the URL **Then** pagination is forced **And** the first page shows 2 draft cells, includes "Coach Beard" but not "Ted Lasso" **And** the "Previous page" link is disabled.
- **Given** the first page of paginated results **When** I click "Next page" **Then** the second page shows 1 draft cell, includes "Ted Lasso" but not "Coach Beard" **And** the "Next page" link is disabled.

## User Story: Perform bulk publish, unpublish, and delete

**As a** content editor **I want** to publish, unpublish, and delete multiple entries at once **so that** I can manage content in bulk efficiently.

### Acceptance Criteria

- **Given** the list view (bulk publish) **When** I select all entries and click "Publish" **Then** a "Publish entries" modal opens showing "Already published 0", "Ready to publish 2", "Waiting for action 0", and "Ready to publish changes 0", with both entries pre-checked.
- **Given** the "Publish entries" modal **When** I uncheck "Select all entries" **Then** the counts reset to 0 **And** the modal "Publish" button is disabled.
- **Given** the "Publish entries" modal **When** I re-check and click "Publish" **Then** I am prompted "Are you sure you want to publish these entries?" **And** confirming results in 2 entries showing "published" status.
- **Given** published entries (bulk unpublish) **When** I select all and click "Unpublish" **Then** I am prompted "Are you sure you want to unpublish these entries?" **And** confirming results in 2 entries showing "draft" status.
- **Given** the list view (bulk delete) **When** I select all and click "Delete" **Then** I am prompted "Are you sure you want to delete these entries?" **And** confirming results in a "No content found" message.
