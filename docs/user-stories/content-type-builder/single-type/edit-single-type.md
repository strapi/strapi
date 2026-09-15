# Edit a Single Type

> Source: `tests/e2e/tests/content-type-builder/single-type/edit-single-type.spec.ts`

All scenarios operate on the existing "Homepage" single type and trigger a server restart after saving.

## User Story: Change a relation type from manyToOne to oneToOne

**As a** Strapi developer **I want** to create a relation on a single type and later change its relation type **so that** I can adjust how it relates without recreating the field.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user adds a relation field targeting the "Product" content type and saves **Then** after restart the "product" field is visible.
- **Given** the "product" relation field exists **When** the user edits the relation, changes its type to oneToOne, and saves **Then** after restart the "product" field is still visible.

## User Story: Toggle internationalization

**As a** Strapi developer **I want** to turn internationalization off and back on for a single type **so that** I can control whether it is localizable.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user disables Internationalization (Advanced settings -> "Internationalization" -> "Yes, disable" -> Finish -> Save) **Then** the save succeeds **And** after restart the heading is visible.
- **Given** Internationalization has been disabled **When** the user re-enables Internationalization **Then** no data-loss confirmation is prompted, demonstrating it was actually disabled **And** after restart the heading is visible.

## User Story: Toggle draft & publish

**As a** Strapi developer **I want** to turn draft & publish off and back on for a single type **so that** I can control whether it supports a draft/published lifecycle.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user disables "Draft & publish" (Advanced settings -> "Yes, disable" -> Finish -> Save) **Then** the save succeeds **And** after restart the heading is visible.
- **Given** "Draft & publish" has been disabled **When** the user re-enables "Draft & publish" **Then** no data-loss confirmation is prompted, demonstrating it was actually disabled **And** after restart the heading is visible.

## User Story: Add a field with a default value

**As a** Strapi developer **I want** to add a text field with a default value **so that** the single type is pre-populated.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user adds a Text field named "testfield" with a default value "mydefault" (set under Advanced settings) and saves **Then** after restart the heading is visible.

## User Story: Configure advanced settings for multiple fields sequentially

**As a** Strapi developer **I want** to add several fields in a row, each with advanced settings **so that** the editor reliably resets its state between fields.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user opens the editor to add each text field **Then** the "Basic settings" tab is active **And** the "Advanced settings" tab is inactive on open.
- **Given** the field editor is open for each of two fields **When** the user sets a default value on the Advanced settings tab ("testfield"/"mydefault" and "testfield2"/"mydefault2") before finishing **Then** the default values are applied.
- **Given** both fields have been added **When** the user saves and the server restarts **Then** the heading is visible.

## User Story: Rename a single type

**As a** Strapi developer **I want** to change a single type's display name **so that** it reads as I intend.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user edits the type, changes the Display name to "New name", and saves **Then** after restart the heading is updated to "New name".

## User Story: Delete a single type

**As a** Strapi developer **I want** to delete a single type **so that** I can remove models I no longer need.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user edits the type, clicks "Delete" (accepting the browser confirmation dialog), and saves **Then** the single type is removed **And** after restart its heading is no longer visible.

## User Story: Localization, per-field localization, and uniqueness on a field

**As a** Strapi developer **I want** to add a field, disable localization on it, and enable uniqueness **so that** I can configure field-level constraints.

### Acceptance Criteria

- **Given** the "Homepage" single type is open **When** the user creates a text field "localizedField" and saves **Then** after restart the heading is visible.
- **Given** the "localizedField" field exists **When** the user disables localization on that field via Advanced settings ("Enable localization for this field") and saves **Then** after restart the heading is visible.
- **Given** the "localizedField" field exists **When** the user enables uniqueness on the same field via Advanced settings ("Unique field") and saves **Then** after restart the heading is visible.
