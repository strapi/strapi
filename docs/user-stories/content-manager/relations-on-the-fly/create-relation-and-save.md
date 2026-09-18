# Relations on the Fly - Create a Relation and Save

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation-and-save.spec.ts`

## User Story: Create a new relation, save it as draft, and have it added to the parent document

**As a** content editor **I want** to create and save a related document as a draft from within the parent's relation field **so that** the draft relation is linked to the parent without publishing.

### Acceptance Criteria

**Scenario: Create and save a relation as a draft from the parent's relation field**

- **Given** an `Article` ("West Ham post match analysis")
- **When** I open the `authors` combobox and choose "Create a relation"
- **Then** the relation modal opens showing the "Create a relation" banner and an "Untitled" heading
- **And** the new relation's `name` field starts empty
- **When** I fill `name` with "Mr. Plop" and click "Save"
- **Then** the name "Mr. Plop" is kept and a "Draft" status is shown
- **When** I close the modal
- **Then** the "Create a relation" modal is hidden and "Mr. Plop" is shown as a related author button on the parent Article
