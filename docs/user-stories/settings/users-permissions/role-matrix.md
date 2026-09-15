# Users & Permissions: Role Matrix

> Source: `tests/e2e/tests/settings/users-permissions/role-matrix.spec.ts`

## User Story: Public and Authenticated end-user roles gate content API access per configured permissions

**As a** Strapi administrator configuring the Users & Permissions plugin **I want** to control which content-API actions the built-in Public and Authenticated end-user roles can perform **so that** front-end and API consumers only get the access explicitly granted to their role.

### Acceptance Criteria

- **Given** the Users & Permissions "Roles" settings page **When** it is opened **Then** the built-in "Authenticated" and "Public" roles are both listed.
- **Given** the Public role has `find` and `findOne` disabled on the Article controller **When** an unauthenticated request is made to `GET /api/articles` **Then** it is rejected with a 403 status.
- **Given** the Public role's `find` and `findOne` on Article are then enabled **When** the same unauthenticated request is made **Then** it succeeds with a 200 status.
- **Given** the Authenticated role has `create` enabled on the Article controller and a new end-user registers via `POST /api/auth/local/register` (defaulting to the Authenticated role) **When** that user creates an article via `POST /api/articles` using their registration JWT **Then** the request succeeds with a 201 status.
