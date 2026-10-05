# Relations on the Fly - Create a Relation Inside a Component and Save

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation-in-component-and-save.spec.ts`

## User Story: Create a relation inside an existing component and save it

**As a** content editor **I want** to create a related document from a relation field nested in a component, and save it **so that** component relations can be created inline.

### Acceptance Criteria

**Scenario: Create and save a relation from a field nested in an existing component**

- **Given** the `Shop` single type with the "Product carousel" component opened
- **When** I click the `products` combobox and choose "Create a relation"
- **Then** the relation modal opens showing "Create a relation" and an "Untitled" heading
- **When** I fill the relation's `name` field with "Nike Zoom Kd Iv Gold C800" and click "Save"
- **Then** the name is kept and a "Draft" status is shown
- **And** the modal then shows "Edit a relation"
- **When** I close the modal
- **Then** "Nike Zoom Kd Iv Gold C800" is shown as a related product button on the component
