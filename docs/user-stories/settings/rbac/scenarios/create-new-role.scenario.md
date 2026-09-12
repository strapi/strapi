# RBAC: Full Role Management Flow

> Source: `tests/e2e/tests/settings/rbac/scenarios/create-new-role.scenario.spec.ts`

## User Story: Administrator creates, assigns, edits, and deletes a role end to end

**As a** Strapi administrator managing roles & permissions **I want** to run a full role lifecycle (create, assign, edit, reassign, delete) **so that** I can verify role management works end to end.

### Acceptance Criteria

- **Given** the user is on the Roles page **When** a new "Publisher" role (description "Role with publishing capabilities") is created with the "Publish article" permission under Collection Types **Then** the "Publisher" role row is visible on the Roles page with matching name and description cells.
- **Given** the "Publisher" role exists **When** it is assigned to the "Editor Testing" user (all other roles unchecked first) **Then** the Users page shows the row `Editor Testing editor@testing.com Publisher`.
- **Given** the "Publisher" role exists **When** its permissions are edited (toggling Read, Update, Create, Delete, and Publish article permissions) and saved **Then** the role row remains visible afterwards.
- **Given** the "Editor Testing" user is assigned the "Publisher" role **When** the user's role is reverted back to "Editor" **Then** the "Publisher" role can then be deleted (confirmed via the alert dialog) **And** is no longer visible in the list.
