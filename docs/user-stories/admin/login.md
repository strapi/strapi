# Admin Login

> Source: `tests/e2e/tests/admin/login.spec.ts`

## User Story: Log in with optional persistent authentication

**As a** Strapi administrator **I want** to log in either as a temporary session or as a persistent ("remember me") session **so that** I can balance convenience and security based on the device I am using.

### Acceptance Criteria

- **Given** I am on the login page **When** I log in without "remember me" **Then** I land on the home page **And** a session cookie named `strapi_admin_refresh` is created and is flagged `httpOnly`.
- **Given** I am logged in without "remember me" **When** I close the page but keep the browser context (simulating a tab close) and reopen the admin **Then** I remain logged in (home page shown).
- **Given** I am logged in without "remember me" **When** I clear cookies (simulating session expiry) and reload **Then** I am redirected to the login page.
- **Given** I am on the login page **When** I log in with "remember me" **Then** I land on the home page **And** the persistent `strapi_admin_refresh` cookie has an explicit expiry (`expires` greater than -1).
- **Given** I am logged in with "remember me" **When** I clear cookies and reload **Then** I am again sent to the login page.

## User Story: Login is rate limited to deter brute force

**As a** Strapi administrator **I want** repeated login attempts to be throttled **so that** the account is protected against brute-force attacks.

### Acceptance Criteria

- **Given** rate limiting is enabled **When** I fill email and password and click Login 6 times **Then** the message "Too many requests, please try again later." is surfaced.
- (Rate limiting is toggled off again after the test.)

## User Story: See validation and credential errors on login

**As a** Strapi administrator **I want** clear validation and error messages when my login input is missing or wrong **so that** I know how to correct it.

### Acceptance Criteria

- **Given** I am on the login page **When** I submit with no email **Then** I see "Value is required" **And** the Email field is focused.
- **Given** I am on the login page **When** I submit with an email but empty password **Then** I see "Value is required" **And** the Password field is focused.
- **Given** I am on the login page **When** I submit a non-existent email with a valid password **Then** I see "Invalid credentials".
- **Given** I am on the login page **When** I submit a valid email with a wrong password **Then** I see "Invalid credentials".

## User Story: Access the forgot password page

**As a** Strapi administrator who forgot their password **I want** to reach a password recovery page and return to sign in **so that** I can recover access to my account.

### Acceptance Criteria

- **Given** I am on the login page **When** I click "Forgot your password?" **Then** the "Password Recovery" view is shown **And** a "Ready to sign in?" link is available to return to the login page.
