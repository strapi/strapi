# Destructive Field Delete Warning

> Source: `tests/e2e/tests/content-type-builder/collection-type/destructive-field-delete.spec.ts`

## User Story: Warn before deleting a field that other fields depend on, and preserve remaining data

**As a** Strapi developer **I want** the Content-Type Builder to warn me before deleting a field that other fields are conditional on **so that** I don't unknowingly break dependent fields, and my other entry data survives the schema change.

### Acceptance Criteria

- **Given** a "Dog" entry named "Rex" has been created with `likesCats` set to true **When** the user opens the Content-Type Builder for "Dog" and clicks "Delete likesCats" **Then** a confirmation dialog opens naming the dependent fields "bestFriendCats" and "preferredCatPersonality".
- **Given** the destructive-delete dialog is open **When** the user clicks "Confirm" and then saves **Then** the server restarts and the schema change is applied.
- **Given** the field has been deleted **When** the user inspects the "Dog" content type in the Content-Type Builder **Then** the "Delete likesCats" control no longer exists.
- **Given** the schema change has been applied **When** the user reopens the "Rex" entry in the Content Manager **Then** the entry still exists **And** its "name" field still has the value "Rex", confirming surviving data was preserved.
