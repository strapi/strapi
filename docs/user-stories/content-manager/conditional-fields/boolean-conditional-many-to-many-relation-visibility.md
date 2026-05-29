# Boolean-Controlled Visibility of Many-to-Many Relation Fields

> Source: `tests/e2e/tests/content-manager/conditional-fields/boolean-conditional-many-to-many-relation-visibility.spec.ts`

## User Story: Toggle a boolean to show or hide a many-to-many relation field

**As a** content editor **I want** a many-to-many relation field to appear or disappear based on a boolean field's value **so that** I only see relation fields that are relevant to the entry I am editing.

### Acceptance Criteria

**Scenario: Relation field is shown when the boolean is true**

- **Given** I am creating a `Dog` entry with `name` set to "Buddy" and `age` set to 4
- **When** the `likesCats` boolean is set to `true`
- **Then** the `bestFriendCats` relation field is visible

**Scenario: Relation field is hidden when the boolean is false**

- **Given** a `Dog` entry where `likesCats` is `true` and the `bestFriendCats` relation field is visible
- **When** `likesCats` is toggled to `false`
- **Then** the `bestFriendCats` relation field becomes hidden
