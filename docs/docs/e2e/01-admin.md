---
sidebar_position: 2
sidebar_label: Admin
---

# Admin

End-to-end coverage for the Strapi admin panel's authentication, account lifecycle, homepage, guided tour, and token management surfaces (API tokens and transfer tokens).

## Overview

The admin test suite exercises the core administrator journeys that frame every other area of the product: initial signup, login with validation and rate limiting, logout, session persistence and expiry, legacy token migration, the personalised homepage and its widgets (including the EE-only audit log widget), homepage widget customisation, the first-run guided tour, and the creation and listing of API and transfer tokens. Collectively these specs validate that an administrator can bootstrap a Strapi instance, authenticate reliably, land on a functional home dashboard, and configure the credentials required for downstream content and transfer workflows.

## Test specs

### `admin/admin-auth-sessions.spec.ts` — Legacy Admin Token Migration

**Purpose:** Validates session behaviour across the JWT-to-cookie migration, ensuring legacy tokens are rejected and cookie-based sessions behave correctly.

**Preconditions:**

- Database reset and seeded with `with-admin` (a pre-existing admin user).
- Cookies cleared before each test; `/admin` loaded fresh.

**Scenarios covered:**

- `Legacy Admin Token Migration` -> `should force logout on first interaction with legacy token`: Injects a legacy `jwtToken` into `localStorage` and verifies the user is redirected to the login page.
- `Legacy Admin Token Migration` -> `should maintain login state after fresh authentication`: After clearing any legacy token and logging in, confirms the `strapi_admin_refresh` cookie is set with `httpOnly` and the session survives a page reload.
- `Legacy Admin Token Migration` -> `should handle session expiry gracefully`: Logs in, clears cookies and `localStorage`, then navigates to a protected route and verifies a redirect back to login.

### `admin/api-tokens.spec.ts` — API Tokens

**Purpose:** Verifies that administrators can create API tokens across the available durations and types, and that newly created tokens appear in the tokens list.

**Preconditions:**

- Shared setup `ctb-edit-st` with `login: true`, `resetFiles: true`, and seed `with-admin`.

**Scenarios covered:**

- `API Tokens` -> `A user should be able to create a 30-day Read-only token`: Creates a 30-day Read-only token via the settings flow and confirms the copy button appears.
- `API Tokens` -> `A user should be able to create a 30-day full-access token`: Creates a 30-day Full access token.
- `API Tokens` -> `A user should be able to create a 7-day token`: Creates a 7-day Full access token.
- `API Tokens` -> `A user should be able to create a 90-day token`: Creates a 90-day Full access token.
- `API Tokens` -> `A user should be able to create a unlimited token`: Creates an unlimited Full access token.
- `API Tokens` -> `Created tokens list page should be correct`: Creates a token named `my test token`, navigates to the tokens list and confirms the row is rendered.

### `admin/ee/home.spec.ts` — Home (EE)

**Purpose:** Validates the Enterprise-only "Last activity" audit log widget on the homepage.

**Preconditions:**

- Runs only when the build is EE (`STRAPI_DISABLE_EE !== 'true'`).
- Database reset and seeded with `with-admin`.
- User logged in before each test.

**Scenarios covered:**

- `Home (EE)` -> `a user should see the last activity widget`: Confirms the "Last activity" widget renders a row for the seeded admin login, performs an article update, returns to the home page, and verifies the widget now shows the `update entry (article)` action for the current user.

### `admin/guided-tour.spec.ts` — Guided tour

**Purpose:** Exercises the first-run Guided Tour overview and each of its four embedded tours end to end.

**Preconditions:**

- Runs only outside EE (`STRAPI_DISABLE_EE === 'true'` branch is not the one that runs; the `describeOnCondition` here runs when edition is not EE).
- Viewport forced to 1920x1080.
- Guided tour enabled via `localStorage` before each test.
- Shared setup `guided-tour` with `login: true`, `resetFiles: true`, and seed `with-admin`.

**Scenarios covered:**

- `Guided tour` -> `should be greeted with the Guided Tour Overview`: Confirms the "Discover your application!" heading and the four steps (Create your schema, Create and publish content, Copy an API token, Deploy your application to Strapi Cloud) are visible.
- `Guided tour` -> `should start and complete each tour`: Runs the Content-Type Builder tour (creating a collection type and a text field, saving and restarting), the Content Manager tour (creating and publishing an entry), the API Tokens tour (regenerating and copying a token), and the Deploy tour; verifies progress increments to 25%, 50%, 75%, and 100% as each step is marked Done.

### `admin/home-customization.spec.ts` — Homepage Widget Customization

**Purpose:** Validates adding and removing widgets on the homepage via the widget selection modal.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- User logged in before each test.

**Scenarios covered:**

- `Homepage Widget Customization` -> `a user should see the empty state when no widgets are available to add`: Opens the Add Widget modal and confirms the "No widgets available to add" empty state is rendered when all widgets are already on the homepage.
- `Homepage Widget Customization` -> `a user should be able to delete a widget from the homepage, and add it again through the modal`: Deletes the Profile widget by hover-and-click, then re-adds it via the Add Widget modal and confirms it reappears on the homepage.

### `admin/home.spec.ts` — Home

**Purpose:** Covers the personalised homepage, profile widget, and the super-admin-only key statistics widget, including role-based visibility.

**Preconditions:**

- Database reset and seeded with `with-admin` before each test.
- `Home as super admin` logs in as the default super admin.
- `Home as editor` logs in using `EDITOR_EMAIL_ADDRESS` / `EDITOR_PASSWORD`.

**Scenarios covered:**

- `Home as super admin` -> `a user should have a personalized homepage`: Verifies the "Hello test" greeting and the homepage title, then edits the profile first name to `Rebecca` and confirms the greeting updates.
- `Home as super admin` -> `a user should see its profile information`: Confirms the Profile widget shows the seeded name, email, and Super Admin role; then edits first/last name and email via profile settings and verifies the widget reflects the new values.
- `Home as super admin` -> `a super admin should see the key statistics widget`: Captures the initial counts for Entries, Assets, Content-Types, Components, Locales, Admins, Webhooks, and API Tokens, then creates one of each (article entry, uploaded asset, new collection type, new component, new locale, invited admin, webhook, API token) and verifies every counter increments by one, finally cleaning up the created content type and component.
- `Home as editor` -> `a user should not see the key statistics widget if they are not a super admin`: Logs in as an editor and confirms the project statistics widget is not rendered.

### `admin/login.spec.ts` — Login

**Purpose:** Covers the successful login flow (with and without "remember me"), rate limiting, form validation, and the forgot password link.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- Cookies cleared before each test; `/admin` loaded fresh.

**Scenarios covered:**

- `Login > Successful login` -> `A user should be able to log in with or without making their authentication persistent`: Logs in without "remember me", verifies the `strapi_admin_refresh` cookie is `httpOnly`, tests tab-close and cookie-clear behaviour, then logs in again with "remember me" and asserts the persistent cookie carries an explicit expiry.
- `Login > Rate limit` -> `Should display a rate limit error message after 5 attempts to login`: Enables the rate limiter, clicks Login six times with a per-browser email variant, and asserts the "Too many requests, please try again later." message appears.
- `Login > Validations` -> `A user should see a validation errors when not passing in an email, a wrong email, not passing a password or a wrong password`: Exercises the four validation cases: missing email, missing password, wrong email address, and wrong password, asserting the appropriate error messages and focused fields.
- `Login > Forgot password` -> `A user should be able to access the forgot password page`: Follows the "Forgot your password?" link to the Password Recovery page and returns via "Ready to sign in?".

### `admin/logout.spec.ts` — Log Out

**Purpose:** Verifies that an authenticated administrator can log out via the user menu.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- User logged in before each test.

**Scenarios covered:**

- `Log Out` -> `a user should be able to logout`: Opens the `test testing` user menu, clicks Log out, and confirms the "Log in to your Strapi account" screen is shown.

### `admin/signup.spec.ts` — Sign Up

**Purpose:** Covers the first-run administrator signup form, including field validation and redirection after submission.

**Preconditions:**

- Database reset and seeded with `without-admin` (filtering out `plugin::i18n.locale` content types) so the app boots to the signup screen.
- Signup form pre-filled with valid data via `fillValidSignUpForm` before each test.

**Scenarios covered:**

- `Sign Up` -> `a user cannot submit the form if the first name field is not filled`: Clears first name, submits, and asserts the field is focused and shows "Value is required".
- `Sign Up` -> `a user cannot submit the form if the email is: not provided, not lowercase or not a valid email address`: Asserts required, lowercase, and format validation messages for the email field.
- `Sign Up` -> `a user cannot submit the form if a password isn't provided or doesn't meet the password validation requirements`: Covers required, missing-number, missing-uppercase, too-short, and non-matching confirmation cases.
- `Sign Up` -> `a user should be able to signup when the strapi instance starts fresh`: Submits a fully valid form and confirms the user lands on the homepage.
- `Sign Up` -> `a user should be redirected to /usecase page if they mark news as true`: Checks "Keep me updated", submits, and confirms navigation to `/usecase` with the "Tell us a bit more about yourself" prompt.

### `admin/transfer-tokens.spec.ts` — Transfer Tokens

**Purpose:** Verifies creation of transfer tokens across all supported durations and types, and that the tokens list renders created tokens with their relative creation time.

**Preconditions:**

- Database reset and seeded with `with-admin`.
- User logged in before each test.

**Scenarios covered:**

- `Transfer Tokens` -> `A user should be able to create a 30-day push token`: Creates a 30-day Push token and verifies the copy screen and expiration date appear.
- `Transfer Tokens` -> `A user should be able to create a 30-day pull token`: Creates a 30-day Pull token.
- `Transfer Tokens` -> `A user should be able to create a 30-day full-access token`: Creates a 30-day Full access token.
- `Transfer Tokens` -> `A user should be able to create a 7-day token`: Creates a 7-day Full access token.
- `Transfer Tokens` -> `A user should be able to create a 90-day token`: Creates a 90-day Full access token.
- `Transfer Tokens` -> `A user should be able to create a unlimited token`: Creates an unlimited Full access token.
- `Transfer Tokens` -> `Created tokens list page should be correct`: Creates a token, waits briefly for the timestamp to stabilise, navigates to the transfer tokens list, and confirms the row renders with a `N seconds/minutes ago` indicator.
