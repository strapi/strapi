# RBAC: Permissions Enforcement

> Source: `tests/e2e/tests/settings/rbac/scenarios/permissions-enforcement.spec.ts`

## User Story: A user without publish permission cannot publish content

**As a** Strapi administrator managing roles & permissions **I want** removing a role's publish permission to be enforced on both the UI and the API **so that** users without that permission cannot publish content through either surface.

### Acceptance Criteria

- **Given** the "Publish article" permission is unchecked and saved on the Author role ("Saved" shown) **When** a user with the Author role opens an existing article ("West Ham post match analysis") **Then** the "Publish" button is disabled.
- **Given** the same Author-role user is authenticated against the admin API **When** they call the publish action directly for that article (`POST /content-manager/collection-types/api::article.article/:documentId/actions/publish?locale=en`) **Then** the request is rejected with a 403 status, confirming the permission is enforced by the API and not only hidden in the UI.
