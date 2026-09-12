# RBAC: See Roles

> Source: `tests/e2e/tests/settings/rbac/actions/see-role.spec.ts`

## User Story: Super Admin can view an existing role's details

**As a** Strapi administrator managing roles & permissions **I want** to open a role and view its details **so that** I can review its configuration.

### Acceptance Criteria

- **Given** the user is on the Roles management page **When** the "Editor" role row is clicked **Then** its detail view opens **And** the Name field has the value "Editor" **And** the Description field has the value "Editors can manage and publish contents including those of other users.".
