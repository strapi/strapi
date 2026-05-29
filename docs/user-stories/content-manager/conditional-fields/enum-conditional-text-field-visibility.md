# Enum-Controlled Visibility of Text Fields

> Source: `tests/e2e/tests/content-manager/conditional-fields/enum-conditional-text-field-visibility.spec.ts`

## User Story: Enum value controls text field visibility and clears the value when hidden

**As a** content editor **I want** a text field to appear or disappear based on an enumeration field's value, with the value cleared when hidden **so that** conditional fields stay consistent with the selected enum option.

### Acceptance Criteria

**Scenario: Text field is shown for the matching enum value**

- **Given** I am creating a `Dog` entry with `name` "Rucola" and `personality` "playful"
- **When** I set `favoriteToy` to "ball"
- **Then** the `favoriteToy` field is visible

**Scenario: Changing the enum hides the text field**

- **Given** a `Dog` entry where `personality` is "playful" and `favoriteToy` is visible
- **When** I change `personality` to "lazy"
- **Then** the `favoriteToy` field is hidden

**Scenario: Entry can be saved while the field is hidden**

- **Given** the `favoriteToy` field is hidden because `personality` is "lazy"
- **When** I save the entry
- **Then** a "Saved Document" confirmation is shown

**Scenario: Hidden field's value is cleared when it reappears, then a new value persists**

- **Given** the `favoriteToy` field was hidden while `personality` was "lazy"
- **When** I change `personality` back to "playful"
- **Then** `favoriteToy` is visible again but empty (its value was cleared when hidden)
- **When** I enter a new value "kong" in `favoriteToy` and save
- **Then** the value persists and the field shows "kong"

## User Story: Publish an entry that has hidden required conditional fields

**As a** content editor **I want** to publish an entry where some required conditional fields are hidden **so that** I am only blocked by required fields that are actually visible.

### Acceptance Criteria

**Scenario: Publishing is only blocked by visible required conditional fields**

- **Given** a `Link` component is defined with a `target` enumeration ("Same window" / "New window") and two required text fields: `linkInternal` (shown when `target` is "Same window") and `linkExternal` (shown when `target` is "New window")
- **And** a repeatable `links` component is added to the `Article` content type
- **When** I create an `Article` with a `Link` whose `target` is "New window"
- **Then** the required `linkExternal` field is visible and `linkInternal` is hidden
- **When** I attempt to publish while the visible required `linkExternal` field is empty
- **Then** publishing fails with a "There are validation errors" alert and a "This value is required" message
- **When** I switch `target` to "Same window"
- **Then** the required `linkInternal` field is shown and `linkExternal` is hidden
- **When** I fill `linkInternal` with "/internal-link" and publish
- **Then** the entry publishes successfully with a "Published Document" confirmation (the now-hidden required `linkExternal` does not block publishing)
