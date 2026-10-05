# Admin Authentication Sessions & Legacy Token Migration

> Source: `tests/e2e/tests/admin/admin-auth-sessions.spec.ts`

## User Story: Legacy token holders are forced to log in again

**As a** Strapi administrator who upgraded from a pre-session-cookie version **I want** my old legacy JWT token to be rejected on first interaction **so that** I am not left in a broken half-authenticated state and am securely redirected to a fresh login.

### Acceptance Criteria

- **Given** a legacy `jwtToken` value is present in browser `localStorage` **When** I navigate to the admin panel **Then** I am redirected to the login page **And** the page title is the login page title **And** the text "Log in to your Strapi account" is visible.

## User Story: Fresh login establishes a persistent session

**As a** Strapi administrator **I want** a fresh login to create a secure session and keep me logged in across reloads **so that** I can keep working without repeatedly re-authenticating.

### Acceptance Criteria

- **Given** a leftover legacy token in `localStorage` lands me on the login page **When** I perform a fresh login **Then** the page title is the home page title (login succeeds) **And** a session cookie named `strapi_admin_refresh` is created **And** the `strapi_admin_refresh` cookie is flagged `httpOnly`.
- **Given** I have just logged in **When** I reload the page **Then** I remain logged in (the home page title is still shown).

## User Story: Expired sessions redirect to login

**As a** Strapi administrator whose session has expired **I want** to be redirected to the login page when I try to use the admin **so that** I am prompted to re-authenticate rather than seeing errors.

### Acceptance Criteria

- **Given** I have logged in successfully and the home page is shown **And** cookies and `localStorage` are cleared (simulating session expiry) **When** I navigate to a protected area such as Settings **Then** I am redirected to the login page **And** the page title is the login page title **And** the text "Log in to your Strapi account" is visible.
