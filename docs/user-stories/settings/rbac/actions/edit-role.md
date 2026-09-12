# RBAC: Edit Roles

> Source: `tests/e2e/tests/settings/rbac/actions/edit-role.spec.ts`

## User Story: Super Admin can edit an existing role

**As a** Strapi administrator managing roles & permissions **I want** to edit a role's name, description, and permissions **so that** I can keep roles aligned with changing needs.

### Acceptance Criteria

- **Given** the user is on the Roles management page **When** the "Editor" role row is clicked **Then** its edit view opens.
- **Given** the "Editor" role edit view is open **When** the name is changed to "Contractor", the description to "Role with contractor capabilities", the Read, Publish, Update, and Delete article permissions are unchecked under the "Collection Types" tab, and the form is saved **Then** the changes are persisted.
- **Given** the changes have been saved **When** returning to the Roles management page **Then** the "Contractor" role row is visible with the matching name and description cells.
