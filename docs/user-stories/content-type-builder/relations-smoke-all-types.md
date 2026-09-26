# Relations Smoke Test for All Relation Types

> Source: `tests/e2e/tests/content-type-builder/relations-smoke-all-types.spec.ts`

## User Story: Every relation type renders in the Content Manager editor and can be connected

**As a** Strapi developer **I want** a collection type carrying every relation type to render correctly in the Content Manager and let me actually connect and save a relation **so that** I can trust each relation type works end to end, not just at CTB save time.

### Acceptance Criteria

- **Given** a new collection type "Relsmoke" is created in one Content-Type Builder save with a text field and all six relation types (`oneWay`, `oneToOne`, `oneToMany`, `manyToOne`, `manyToMany`, `manyWay`) each targeting the "Article" content type **Then** the content type is created.
- **Given** the "Relsmoke" content type exists **When** the user opens a new entry in its Content Manager edit view **Then** a combobox is visible for each of the six relation fields ("relOneWay", "relOneToOne", "relOneToMany", "relManyToOne", "relManyToMany", "relManyWay").
- **Given** the new entry is open **When** the user selects the entry "West Ham post match analysis" in the "relManyWay" combobox and clicks "Save" **Then** a "Saved Document" notification is shown **And** the connected relation "West Ham post match analysis" is visible on the entry, confirming the relation was persisted.
