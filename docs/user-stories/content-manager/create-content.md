# Adding Content

> Source: `tests/e2e/tests/content-manager/create-content.spec.ts`

## User Story: Save and publish content

**As a** content editor **I want** to fill in a content type's required fields and save and publish it **so that** the entry is created and made live.

### Acceptance Criteria

- **Given** the Match content type **When** I fill the required "opponent" text field with a value (e.g. "testname") and save the entry **Then** the entry is saved.
- **Given** the saved entry **When** I publish it **Then** the entry is published **And** the saved field values are verified to be present.

## User Story: Set component order when creating content

**As a** content editor **I want** to reorder dynamic zone components by dragging them **so that** the components are saved and displayed in the order I choose.

### Acceptance Criteria

- **Given** I am creating a Match entry with an "opponent" text field and a dynamic zone ("sections") containing a "player" component (full_name "Roy Kent") and a "variations" component (name "Roy Kent Shirt Jersey") **When** I drag the "variations" component above the "player" component **Then** the "variations" component is positioned before the "player" component.
- **Given** the reordered components **When** I save the entry **Then** a "Saved Document" confirmation appears **And** the field values are verified **And** the "variations" component appears before the "player" component in the saved order.

## User Story: See validation errors when publishing invalid required/regex fields

**As a** content editor **I want** clear validation errors when I try to publish content with invalid or missing values **so that** I know what to correct before publishing.

### Acceptance Criteria

- **Given** a Match with an empty required text field ("opponent") **When** I publish it **Then** the error "This value is required" is shown.
- **Given** a Match where the "opponent" text field violates its regex (value "richmond") **When** I publish it **Then** "The value does not match the regex" is shown.
- **Given** an empty required text field inside a single component **When** I publish **Then** "This value is required" is shown.
- **Given** a regex-violating value inside a single component **When** I publish **Then** "The value does not match the regex" is shown.
- **Given** an empty required text field inside a repeatable component **When** I publish **Then** "This value is required" is shown.
- **Given** a regex-violating value inside a repeatable component **When** I publish **Then** "The value does not match the regex" is shown.
- **Given** an empty required text field inside a dynamic zone component **When** I publish **Then** "This value is required" is shown.
- **Given** a regex-violating value inside a dynamic zone component **When** I publish **Then** "The value does not match the regex" is shown.
