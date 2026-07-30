# Boolean-Controlled Visibility of Text Fields

> Source: `tests/e2e/tests/content-manager/conditional-fields/boolean-conditional-text-field-visibility.spec.ts`

## User Story: Toggle a boolean to show or hide a text field and clear its value when hidden

**As a** content editor **I want** a text field to appear or disappear based on a boolean field, with its value cleared when hidden **so that** hidden conditional fields do not retain stale data.

### Acceptance Criteria

**Scenario: Text field is shown and editable while the boolean is true**

- **Given** I am creating a `Products` entry with `name` "T-shirt" and `sku` 1
- **When** the entry is created
- **Then** the `sku` field is visible and can be set to "5"

**Scenario: Text field is hidden when the boolean is false**

- **Given** the `sku` field is visible with a value
- **When** the `isAvailable` boolean is set to `false`
- **Then** the `sku` field becomes hidden

**Scenario: Hidden field's value is cleared when it reappears**

- **Given** the `sku` field is hidden because `isAvailable` is `false` and the entry has been saved
- **When** `isAvailable` is toggled back to `true`
- **Then** the `sku` field reappears with an empty value (its previous value was cleared while hidden)
