# Relations on the Fly - Create a Relation Inside a New Component and Save

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation-in-new-component-and-save.spec.ts`

## User Story: Create a relation inside a newly added component and save it

**As a** content editor **I want** to add a new component, then create and save a related document from a relation field within it **so that** I can build out content and its relations inline.

### Acceptance Criteria

**Scenario: Create and save a relation from a field in a newly added component**

- **Given** the `Shop` single type
- **When** I add a new component via "Add a component to content" and open the "Product carousel" component
- **And** I click the `products` combobox and choose "Create a relation"
- **Then** the relation modal opens showing "Create a relation" and an "Untitled" heading
- **When** I fill the relation's `name` field with "Nike Zoom Kd Iv Gold C800" and click "Save"
- **Then** the name is kept and a "Draft" status is shown
- **And** the modal then shows "Edit a relation"
- **When** I close the modal
- **Then** "Nike Zoom Kd Iv Gold C800" is shown as a related product button on the new component
