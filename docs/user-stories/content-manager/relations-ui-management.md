# Relations UI Management

> Source: `tests/e2e/tests/content-manager/relations-ui-management.spec.ts`

## User Story: Connect, persist, and remove relations to existing entries on a bidirectional many-to-many field

**As a** content editor **I want** to connect an existing entry to a many-to-many relation field, have it persist and show on the inverse side, and later remove it **so that** I can manage relationships to existing content, not just create new related entries inline.

### Acceptance Criteria

- **Given** the Article "West Ham post match analysis", already linked to the author "Coach Beard" **When** I open it **Then** "Coach Beard" is shown as a related author button.
- **Given** the open Article **When** I connect the existing author "Ted Lasso" via the `authors` combobox **Then** "Ted Lasso" is also shown as a related author button.
- **Given** both authors are connected **When** I click "Save" **Then** a "Saved Document" confirmation appears.
- **Given** the article has been saved with "Ted Lasso" connected **When** I open the "Ted Lasso" Author entry **Then** it lists "West Ham post match analysis" as a related article on its inverse side, confirming the relation was persisted.
- **Given** the article has been saved **When** I re-open it from scratch (a fresh fetch, not a reload) **Then** both "Coach Beard" and "Ted Lasso" are shown as related author buttons.
- **Given** the re-opened article with both authors connected **When** I remove "Ted Lasso" and click "Save" **Then** a "Saved Document" confirmation appears.
- **Given** the removal has been saved **When** I re-open the article again **Then** "Coach Beard" is still shown as a related author button **And** "Ted Lasso" is no longer shown.

## User Story: Preserve relation order in a dynamic-zone component through reordering, save, and publish

**As a** content editor **I want** the order of relations within a dynamic-zone component's relation field to be preserved when I add, remove, reorder, save, and publish **so that** the order I set is reflected consistently on both the Draft and Published views.

### Acceptance Criteria

- **Given** the `Shop` single type's "Product carousel - 23/24 kits" component with three published products connected in order ("First product", "Second product", "Third product") **When** I save and publish, then reload the page and re-open the component (on the "Draft" tab) **Then** the products are still shown in that same order.
- **Given** that order **When** I remove "First product", connect "Fourth product" and "Fifth product", and drag "Third product" up one position (via keyboard: focus its "Drag" handle, Space to grab, Arrow Up, Space to drop) **Then** the relations are immediately reordered to "Third product", "Second product", "Fourth product", "Fifth product".
- **Given** that reordering **When** I click "Save" **Then** a "Saved Document" confirmation appears **And** the new order is preserved **And** "First product" is no longer shown.
- **Given** the saved reordering **When** I click "Publish" **Then** a "Published Document" confirmation appears **And** switching to the "Published" tab and re-opening the component shows the same order ("Third product", "Second product", "Fourth product", "Fifth product") with "First product" still absent.
