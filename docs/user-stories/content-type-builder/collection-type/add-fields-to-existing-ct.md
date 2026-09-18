# Add Component, Dynamic Zone, and Relation to an Existing Collection Type

> Source: `tests/e2e/tests/content-type-builder/collection-type/add-fields-to-existing-ct.spec.ts`

## User Story: Extend an existing collection type with a component, a dynamic zone, and a relation

**As a** Strapi developer **I want** to add a component, a dynamic zone, and a relation to a content type that already exists **so that** I can grow its schema incrementally and see the new fields render correctly in the Content Manager.

### Acceptance Criteria

- **Given** the "Article" content type already exists **When** the user adds a new single (non-repeatable) component ("testcomponent") in a newly created category ("testcategorycomp") with its own text attribute, saving triggers a server restart **Then** the schema change is applied.
- **Given** the component has been added **When** the user adds a `oneWay` relation ("testrelation") targeting the "Author" content type, saving triggers a server restart **Then** the schema change is applied.
- **Given** the relation has been added **When** the user adds a dynamic zone ("testdz") containing a newly created component ("TestDZComponent") in its own category ("testcategorydz") with its own text attribute, saving triggers a server restart **Then** the schema change is applied.
- **Given** all three fields have been added to "Article" **When** the user opens a new entry in the Article Content Manager edit view **Then** the "testcomponent" field is visible **And** an "Add a component to testdz" button is visible for the dynamic zone **And** a "testrelation" combobox is visible for the relation.
