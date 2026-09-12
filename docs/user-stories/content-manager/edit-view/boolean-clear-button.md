# Boolean Field Clear Button

> Source: `tests/e2e/tests/content-manager/edit-view/boolean-clear-button.spec.ts`

## User Story: Clear button is hidden for required boolean fields

**As a** content editor **I want** required boolean fields to never offer a Clear button **so that** I cannot leave a required field with no value.

### Acceptance Criteria

**Scenario: Required boolean never shows a Clear button**

- **Given** I am creating a `Products` entry with a required `isAvailable` boolean field
- **When** the entry is created
- **Then** the `isAvailable` field is checked by default (its default value is `true`)
- **And** the "Clear" button is not visible while the field is `true`
- **When** I set the field to `false`
- **Then** the "Clear" button is not revealed
- **When** I set the field back to `true`
- **Then** the "Clear" button is not revealed

## User Story: Clear button appears only for optional boolean fields with a value

**As a** content editor **I want** the Clear button to appear on optional boolean fields only when they hold a value **so that** I can reset an optional boolean back to null.

### Acceptance Criteria

**Scenario: Clear button appears for an optional boolean once it holds a value**

- **Given** I am creating a `Cat` entry with an optional `likesDogs` boolean field
- **When** I check the `likesDogs` field
- **Then** the "Clear" button becomes visible
- **And** the "Clear" button stays visible whether `likesDogs` is set to `true` or `false`
- **When** I click "Clear"
- **Then** the field is set to null and the "Clear" button is no longer visible

## User Story: Clearing a boolean sets it to null and persists after save

**As a** content editor **I want** clearing a boolean to persist as null after saving and reloading **so that** the null state is stored reliably.

### Acceptance Criteria

**Scenario: Cleared boolean persists as null after save and reload**

- **Given** a `Cat` entry where `likesDogs` is checked and set to `true`
- **Then** the "Clear" button is visible and the field is shown as checked
- **When** I click "Clear"
- **Then** the field is left unchecked
- **When** I save
- **Then** a "Saved" confirmation is shown
- **When** I reload and reopen the "Boolean Clear Persist Cat" entry
- **Then** the `likesDogs` field remains unchecked and the "Clear" button is not visible
