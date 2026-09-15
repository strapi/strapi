# Uniqueness

> Source: `tests/e2e/tests/content-manager/uniqueness.spec.ts`

## User Story: Enforce unique field values within the same content type and dimensions

**As a** content editor **I want** unique fields to reject duplicate values within the same content type, locale, and publication state **so that** I cannot accidentally create entries that violate uniqueness constraints, while still being free to reuse the same value in a different locale.

### Acceptance Criteria

- **Given** every document-level unique field type on the Unique content type — scalar fields (uniqueString, uniqueNumber, uniqueEmail, uniqueDate, UID), single-component fields (ComponentTextShort, ComponentTextLong, ComponentNumberInteger, ComponentNumberFloat, ComponentEmail), and repeatable-component fields (the same set) **When** the following scenarios are run **Then** each behaves as described below.
- **Given** a repeatable component field **When** I add two entries with the same value within one document and attempt to publish **Then** a "2 errors occurred" alert is shown (the duplicate entry within the same document is rejected) **And** the duplicate entry can then be removed.
- **Given** the Unique content type **When** I create and save a first entry with a given unique value **Then** a "Saved document" confirmation appears.
- **Given** a first entry with a unique value exists **When** I create, save, and publish a second entry with the same value **Then** publishing succeeds **And** a "Published document" confirmation appears.
- **Given** an already-published value in the same locale/state **When** I create and save a third entry with the same value and attempt to publish it **Then** a "This attribute must be unique" alert is shown (the duplicate is rejected).
- **Given** the same value already used in the default locale **When** I switch to the French (fr) locale and create, save, and publish an entry with that value **Then** it succeeds ("Saved document" then "Published document") — uniqueness is scoped per locale.
- Note: this scenario is skipped on WebKit due to a known browser bug.
