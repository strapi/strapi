# Homepage Widgets & Personalization

> Source: `tests/e2e/tests/admin/home.spec.ts`

## User Story: See a personalized greeting on the homepage

**As a** super admin **I want** the homepage to greet me by my first name and reflect changes I make to my profile **so that** the dashboard feels personal and up to date.

### Acceptance Criteria

- **Given** I have logged in **When** I view the homepage **Then** it shows "Hello test" **And** the page title matches "homepage".
- **Given** I am logged in **When** I edit my profile first name to "Rebecca", save, and return Home **Then** the homepage shows "Hello Rebecca".

## User Story: See my profile information widget

**As a** super admin **I want** a Profile widget showing my name, email, and role **so that** I can confirm my account details at a glance and edit them.

### Acceptance Criteria

- **Given** I am on the homepage **When** I view the Profile widget **Then** it is visible **And** it shows the name "test testing" **And** it shows the email "test@testing.com" **And** it shows the role "Super Admin".
- **Given** the Profile widget is visible **When** I click "Profile settings", update first name to "Ted", last name to "Lasso", and email to "ted.lasso@afcrichmond.co.uk", save, and return Home **Then** the Profile widget shows "Ted Lasso" and "ted.lasso@afcrichmond.co.uk".

## User Story: See live key statistics as a super admin

**As a** super admin **I want** a project statistics widget that tracks counts of entries, assets, content-types, components, locales, admins, webhooks, and API tokens **so that** I can monitor the size and growth of my project, with counts updating as I add items.

### Acceptance Criteria

- **Given** I am a super admin on the homepage **When** I view the "project statistics" widget **Then** it is visible **And** it displays counts for Entries, Assets, Content-Types, Components, Locales, Admins, Webhooks, and API Tokens.
- **Given** the initial counts can be parsed **When** I create one of each item **Then** the widget reflects the incremented counts:
  - Creating an Article entry increases Entries by 1.
  - Uploading an asset increases Assets by 1.
  - Creating a new collection type increases Content-Types by 1.
  - Creating a new component increases Components by 1.
  - Adding a new locale (Afrikaans) increases Locales by 1.
  - Inviting a new admin user increases Admins by 1.
  - Creating a new webhook increases Webhooks by 1.
  - Creating a new API token increases API Tokens by 1.
- **Given** the count assertions have passed **When** the test cleans up **Then** the newly created collection type and component are deleted to reset the dataset (with a server restart).

## User Story: See the Deploy Now widget as a super admin

**As a** super admin **I want** a Deploy widget promoting Strapi Cloud **so that** I have a clear path to take my project live.

### Acceptance Criteria

- **Given** I am a super admin on the homepage **When** I view the "Deploy" widget **Then** it is visible **And** it shows "Ready to go live" **And** it shows "Deploy with Strapi Cloud" **And** it shows a "Deploy now" link.

## User Story: Key statistics widget hidden from non-super-admins

**As an** editor (non-super-admin) **I want** the project statistics widget hidden **so that** I do not see project-wide data beyond my role's scope.

### Acceptance Criteria

- **Given** I have logged in as an editor (non-super-admin) **When** I view the homepage **Then** the "project statistics" widget is not visible.

## User Story: Deploy widget visible to all roles

**As an** editor (non-super-admin) **I want** the Deploy widget to remain visible **so that** any role can discover the path to deploy the application.

### Acceptance Criteria

- **Given** I have logged in as an editor (non-super-admin) **When** I view the homepage **Then** the "Deploy" widget is visible **And** it shows a "Deploy now" link.
