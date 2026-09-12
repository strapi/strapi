# Date Field

> Source: `tests/e2e/tests/content-manager/date.spec.ts`

## User Story: Select the current date from the datepicker

**As a** content editor **I want** to choose today's date in a date field **so that** the entry records the current date correctly.

### Acceptance Criteria

- **Given** I am creating a Match entry **When** I set its "date" field to today's date (MM/DD/YYYY format) and save **Then** the saved value is verified **And** the date input shows today's date in MM/DD/YYYY format.

## User Story: Enter a future date directly into the input

**As a** content editor **I want** to type a future date directly into a date field **so that** I can set dates without clicking through the datepicker UI.

### Acceptance Criteria

- **Given** I am creating a Match entry **When** I set its "date" field to a date one year in the future (MM/DD/YYYY format) and save **Then** the saved value is verified **And** the date input shows the future date in MM/DD/YYYY format.

## User Story: Handle an ISO-formatted date

**As a** content editor **I want** an ISO date value to be stored and displayed correctly **so that** dates are not corrupted by locale or timezone parsing.

### Acceptance Criteria

- **Given** I am creating a Match entry whose "date" field is derived from an ISO date string (e.g. `2025-01-09`) **When** I enter it in MM/DD/YYYY format and save **Then** the saved value is verified **And** the date input shows the expected MM/DD/YYYY value.
