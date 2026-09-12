# Content-Type Builder Edit View

> Source: `tests/e2e/tests/content-type-builder/ctb-edit-view.spec.ts`

## User Story: Navigate to the Edit View and see content type fields

**As a** Strapi developer **I want** to open a content type in the Content-Type Builder edit view and see its fields and add-field controls **so that** I can inspect and extend its schema.

### Acceptance Criteria

- **Given** the Content-Type Builder is open **When** the user selects the "Shop" single type **Then** the "Shop" edit view is shown.
- **Given** the "Shop" edit view is shown **When** the user inspects it **Then** two "Add another field to this component" buttons are visible **And** an "Add a component" button is visible **And** an "Add another field to this single type" button is visible.
