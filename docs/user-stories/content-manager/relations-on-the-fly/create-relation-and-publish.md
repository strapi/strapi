# Relations on the Fly - Create a Relation and Publish

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation-and-publish.spec.ts`

## User Story: Create a new relation, publish it, and have it added to the parent document

**As a** content editor **I want** to create and publish a related document from within the parent's relation field **so that** the published relation is immediately linked to the parent.

### Acceptance Criteria

**Scenario: Create and publish a relation from the parent's relation field**

- **Given** an `Article` ("West Ham post match analysis")
- **When** I open the `authors` combobox and choose "Create a relation"
- **Then** the relation modal opens with the new relation's `name` field empty
- **When** I fill `name` with "Mr. Fred Passo" and click "Publish"
- **Then** the name "Mr. Fred Passo" is kept and a "Published" status is shown
- **When** I close the modal
- **Then** "Mr. Fred Passo" is shown as a related author button on the parent Article
