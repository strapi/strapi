# Admin Logout

> Source: `tests/e2e/tests/admin/logout.spec.ts`

## User Story: Log out of the admin panel

**As a** Strapi administrator **I want** to log out from the user menu **so that** I can end my session and protect my account when I am done.

### Acceptance Criteria

- **Given** I am logged in **When** I click the user button ("test testing") **Then** a menu opens.
- **Given** the user menu is open **When** I click the "Log out" menu item **Then** the session ends **And** the login screen text "Log in to your Strapi account" is visible.
