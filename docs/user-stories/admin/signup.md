# Admin Sign Up (First Administrator)

> Source: `tests/e2e/tests/admin/signup.spec.ts`

_These tests start from a fresh Strapi instance with no existing admin user._

## User Story: First name is required to sign up

**As a** first-time user creating the initial admin account **I want** the form to require a first name **so that** my account has a valid identity.

### Acceptance Criteria

- **Given** I am on the sign-up form **When** I clear the First name field and click "Let's start" **Then** focus stays on the First name field **And** the message "Value is required" is shown.

## User Story: Email must be provided, lowercase, and valid

**As a** first-time user creating the initial admin account **I want** clear email validation **so that** I provide a correctly formatted email.

### Acceptance Criteria

- **Given** I am on the sign-up form **When** I submit an empty email **Then** focus stays on the Email field **And** "Value is required" is shown.
- **Given** I am on the sign-up form **When** I submit an uppercase email **Then** "The value must be a lowercase string" is shown.
- **Given** I am on the sign-up form **When** I submit "notanemail" **Then** "This is not a valid email" is shown.

## User Story: Password must meet strength requirements and match confirmation

**As a** first-time user creating the initial admin account **I want** password validation enforced **so that** my account is protected by a strong, correctly confirmed password.

### Acceptance Criteria

- **Given** I am on the sign-up form **When** I submit an empty password **Then** focus stays on the Password field **And** "Value is required" is shown.
- **Given** I am on the sign-up form **When** I submit a password with no number ("noNumberInHere") **Then** "Password must contain at least one number" is shown.
- **Given** I am on the sign-up form **When** I submit a password with no uppercase character ("lowerca5e") **Then** "Password must contain at least one uppercase character" is shown.
- **Given** I am on the sign-up form **When** I submit a too-short password ("S4ort") **Then** "The value is too short" is shown.
- **Given** I am on the sign-up form **When** I submit a confirmation that differs ("doesNotMatch") **Then** "Passwords do not match" is shown.

## User Story: Sign up successfully on a fresh instance

**As a** first-time user **I want** to create the initial admin account on a fresh Strapi instance **so that** I can begin using the admin panel.

### Acceptance Criteria

- **Given** a valid sign-up form is filled in **When** I click "Let's start" **Then** I land on the home page (page title is the home title).

## User Story: Opting into news redirects to the use-case page

**As a** first-time user who opts to receive updates **I want** to be guided to a use-case page after sign up **so that** I can share more about how I plan to use Strapi.

### Acceptance Criteria

- **Given** a valid sign-up form is filled in **When** I check "Keep me updated" and click "Let's start" **Then** I navigate to a URL containing `/usecase` **And** the page shows "Tell us a bit more about yourself".
