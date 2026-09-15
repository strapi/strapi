# Settings Smoke Test

> Source: `tests/e2e/tests/settings/smoke-test.spec.ts`

## User Story: Every expected settings feature is displayed

**As a** Strapi administrator managing roles & permissions **I want** every settings section to be reachable from the menu **so that** I can access all configuration areas of the admin panel.

### Acceptance Criteria

- **Given** the admin panel is open **When** the Settings overview page is opened **Then** it is reachable.
- **Given** the user is in Settings **When** navigating to each of API Tokens, Documentation, Internationalization, Media Library, Single Sign-On, Transfer Tokens, Webhooks **Then** each page shows its header.
- **Given** the user is in Settings **When** navigating to the Administration Panel pages **Then** Roles and Users are reachable.
- **Given** the user is in Settings **When** navigating to the Users & Permissions pages **Then** Roles, Providers, Email templates, and Advanced settings are reachable.
- **Given** the instance is non-EE **When** navigating to the EE-only pages (Review Workflows, Audit Logs) **Then** they are still displayed because they show a purchase page.

## User Story: Every EE feature is displayed (EE only)

**As a** Strapi administrator managing roles & permissions **I want** Enterprise settings pages reachable in EE **so that** I can configure Enterprise features.

### Acceptance Criteria

- This behavior is only tested in the Enterprise Edition (EE).
- **Given** the instance is EE **When** navigating to the Review Workflows settings page **Then** it is reachable **And** shows its header.
- **Given** the instance is EE **When** navigating to the Audit Logs settings page (under Administration Panel) **Then** it is reachable **And** shows its header.
