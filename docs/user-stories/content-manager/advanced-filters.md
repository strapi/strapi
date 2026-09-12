# Advanced Filters

> Source: `tests/e2e/tests/content-manager/advanced-filters.spec.ts`

## User Story: Filter the list view by a text field operator and match the API's result set

**As a** content editor **I want** the list-view filter UI to return the same rows that a direct API query with the equivalent filter would return **so that** I can trust that the filters I apply in the UI are correct.

### Acceptance Criteria

- **Given** the Author list view with three non-localized entries ("Ted Lasso", "Coach Beard", "Led Tasso") **When** I view the list **Then** all three names are visible.
- **Given** the "name" field **When** I apply the "contains" filter with value "Lasso" **Then** the filter chip "name contains Lasso" is shown **And** only "Ted Lasso" remains visible in the list **And** the equivalent API query (`filters[name][$contains]=Lasso`) returns only "Ted Lasso".
- **Given** the "name" field **When** I apply the "is" filter with value "Coach Beard" **Then** the filter chip "name is Coach Beard" is shown **And** only "Coach Beard" remains visible in the list **And** the equivalent API query (`filters[name][$eq]=Coach Beard`) returns only "Coach Beard".
- **Given** the "name" field **When** I apply the "is not" filter with value "Ted Lasso" **Then** the filter chip "name is not Ted Lasso" is shown **And** "Coach Beard" and "Led Tasso" remain visible while "Ted Lasso" is filtered out **And** the equivalent API query (`filters[name][$ne]=Ted Lasso`) returns "Coach Beard" and "Led Tasso".
- **Given** any of the above filters is applied **When** I click its filter chip to remove it **Then** the chip disappears **And** the unfiltered list (including "Ted Lasso") is shown again.
