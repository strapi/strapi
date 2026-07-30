# RBAC: Create Roles

> Source: `tests/e2e/tests/settings/rbac/actions/create-role.spec.ts`

## User Story: Super Admin can create a new role

**As a** Strapi administrator managing roles & permissions **I want** to create a new role with permissions **so that** I can define a reusable set of capabilities for users.

### Acceptance Criteria

- **Given** the user is on Settings > Administration Panel > Roles **When** "Add new role" is clicked **Then** the create form opens.
- **Given** the create form is open **When** the role is given the name "Publisher" and description "Role with publishing capabilities", the "Publish article" permission is checked under the "Collection Types" permissions tab, and the form is saved **Then** the role is created.
- **Given** the "Publisher" role has been created **When** returning to the Roles management page **Then** the "Publisher" role row is visible **And** its cells show the name "Publisher" and description "Role with publishing capabilities".
