# Edit View - Enumeration Fields

> Source: `tests/e2e/tests/content-manager/edit-view/enumeration-fields.spec.ts`

## User Story: Required vs non-required enumeration field behavior

**As a** content editor **I want** required enumeration fields to be enforced and non-required ones to allow resetting **so that** enum validation matches each field's configuration.

### Acceptance Criteria

**Scenario: Required enum is enforced while a non-required enum can be reset**

- **Given** a required `hair` enumeration field (values "White" and "Black") is added to the `Cat` content type via the Content-Type Builder, saved, and the server restarts
- **When** I create a new `Cat` entry with only `name` "Zoe" and click "Publish"
- **Then** a "There are validation errors" alert is shown (the required `hair` enum is unset)
- **When** I select "White" for `hair` and "friendly" for `personality`, then publish
- **Then** a "Published document" confirmation is shown
- **When** I select the "Choose here" option in the non-required `personality` combobox
- **Then** the `personality` combobox is reset
- **And** in the required `hair` combobox, the "Choose here" reset option is disabled (the field cannot be cleared)
- **When** I re-select "White" for `hair` and publish
- **Then** a "Published document" confirmation is shown
- **When** I remove the `hair` field from the `Cat` content type via the Content-Type Builder
- **Then** the server restarts
