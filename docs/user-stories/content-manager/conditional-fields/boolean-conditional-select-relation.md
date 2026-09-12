# Selecting and Saving Relations in Boolean-Controlled Conditional Fields

> Source: `tests/e2e/tests/content-manager/conditional-fields/boolean-conditional-select-relation.spec.ts`

## User Story: Select a relation inside a conditional field and save it

**As a** content editor **I want** to select a relation in a field that is only shown when a boolean is enabled, and have that selection persist after saving **so that** conditional relation data is stored reliably.

### Acceptance Criteria

**Scenario: Create a Cat to relate to**

- **Given** I am creating a `Cat` entry with `name` "Whiskers", `age` 3, and `personality` "friendly"
- **When** I save the entry
- **Then** a "Saved Document" confirmation is shown

**Scenario: Select a relation in a conditional field and have it persist after saving**

- **Given** I am creating a `Dog` entry with `name` "Luna" and `age` 1
- **And** a `Cat` entry "Whiskers" exists to relate to
- **When** `likesCats` is set to `true`
- **Then** the `bestFriendCats` relation field is visible
- **And** the `bestFriendCats` relation field is a combobox
- **When** I click the `bestFriendCats` combobox and select "Whiskers"
- **Then** that cat is added as a related entry
- **When** I save the `Dog` entry
- **Then** a "Saved Document" confirmation is shown
- **And** the selected relation "Whiskers" remains visible on the entry
