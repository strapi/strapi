# RBAC: Delete Roles

> Source: `tests/e2e/tests/settings/rbac/actions/delete-role.spec.ts`

## User Story: Super Admin can delete an existing role

**As a** Strapi administrator managing roles & permissions **I want** to delete a role that is no longer needed **so that** the roles list stays clean and unused roles are removed.

### Acceptance Criteria

- **Given** the user assigned to the "author" role has been deleted in setup (confirmed via the alert dialog) so the role can be removed, and the "Author" role row on the Roles management page has a "Delete" button **When** "Delete" is clicked and confirmed in the alert dialog **Then** the role is removed **And** the "Author" role row is no longer visible in the list.
