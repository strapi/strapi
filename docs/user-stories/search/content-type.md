# Content Type Search

> Source: `tests/e2e/tests/search/content-type.spec.ts`

## User Story: Search a content type list view by name

**As a** content editor **I want** to search entries in a content-type list view **so that** I can filter the table to matching documents.

### Acceptance Criteria

- **Given** the Products list view with a new entry created with a given name, saved, and navigated back to the list **When** the search input is opened, the search term is typed, and Enter is pressed **Then** the table is filtered **And** the table containing the search term has exactly 2 rows (the header row plus the single matching entry), confirming non-matching entries are filtered out.
- Covered case: ASCII search term with no spaces (e.g. "TestMe").
- Additional cases are defined but currently skipped (`test.fixme`): ASCII with spaces, extended ASCII, Unicode, emojis, special characters, and mixed encoding.
