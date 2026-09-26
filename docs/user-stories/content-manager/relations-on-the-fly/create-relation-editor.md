# Relations on the Fly - Create a Relation Without Permission

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation-editor.spec.ts`

## User Story: Author without create permission cannot create a relation

**As an** author who lacks permission to create the related content type **I want** the "Create a relation" option to be disabled **so that** I cannot create relations I am not allowed to.

### Acceptance Criteria

**Scenario: Author without create permission sees the Create a relation option disabled**

- **Given** I am logged in as an author (using the author credentials)
- **When** I open an `Article` ("West Ham post match analysis") and click the `authors` combobox
- **Then** a "Create a relation" option is shown
- **And** the "Create a relation" option is disabled and has the attribute `aria-disabled="true"`
