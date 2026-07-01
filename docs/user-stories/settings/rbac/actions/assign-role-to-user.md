# RBAC: Assign Role to Users

> Source: `tests/e2e/tests/settings/rbac/actions/assign-role-to-user.spec.ts`

## User Story: Super Admin can assign a role to any user

**As a** Strapi administrator managing roles & permissions **I want** to change a user's role **so that** I can control what each user is allowed to do.

### Acceptance Criteria

- **Given** the user is on Settings > Administration Panel > Users **When** "Edit Editor Testing" is clicked **Then** the "Editor Testing" user opens.
- **Given** the "Editor Testing" user is open **When** the existing "Editor" role is unchecked and the "Author" role is checked in the "User's roles" selector, then saved **Then** the change is persisted.
- **Given** the role change has been saved **When** returning to the Users management page **Then** the user row no longer shows the "Editor" role **And** now shows the "Author" role (matching `Editor Testing editor@testing.com Author`).
