# Edit Schema Without Data Loss

> Source: `tests/e2e/tests/content-type-builder/collection-type/edit-schema-no-data-loss.spec.ts`

## User Story: Adding then removing a field does not corrupt existing entries

**As a** Strapi developer **I want** existing entry data to survive adding a field and later removing it again **so that** I can safely experiment with a content type's schema without risking data loss.

### Acceptance Criteria

- **Given** the seeded "West Ham post match analysis" Article entry **When** the user opens it in the Content Manager **Then** its "title" field has the value "West Ham post match analysis" **And** its "slug" field has the value "west-ham-post-match-analysis".
- **Given** a new text field ("tempnotes") is added to the "Article" content type, triggering a server restart **When** the user reopens the same entry **Then** its "title" and "slug" values are unchanged.
- **Given** the "tempnotes" field is then deleted from "Article" and saved, triggering another server restart **When** the user reopens the same entry again **Then** its "title" and "slug" values are still unchanged, confirming the add-then-remove cycle did not corrupt existing data.

## User Story: Renaming a field preserves existing content data

**As a** Strapi developer **I want** an entry's data to be carried over when I rename the field that holds it **so that** renaming a field in the Content-Type Builder doesn't silently delete content.

> Note: this test is a known limitation, marked `test.fixme` and not currently enforced. Strapi's schema diffing matches database columns by name, so renaming a field's attribute name is seen as removing the old column and creating a new, empty one — there is no rename-with-migration support. Confirmed as expected behavior by maintainers (strapi/strapi#25076, #19075, #12626, #12597); tracked as a feature request. The scenario below documents the intended (not yet real) behavior.

### Acceptance Criteria

- **Given** a text field "bio" has been added to "Article" **When** the user creates an entry with "title" "Rename test entry" and "bio" "preserved bio content" **Then** the entry is saved.
- **Given** that entry exists **When** the user renames the "bio" field to "biography" in the Content-Type Builder and saves, triggering a server restart **Then** reopening the entry in the Content Manager would show its "biography" field still holding the value "preserved bio content".
