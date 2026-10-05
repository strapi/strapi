# Homepage Last Activity Widget (Enterprise Edition)

> Source: `tests/e2e/tests/admin/ee/home.spec.ts`

_These behaviors run only on the Enterprise Edition (EE) build._

## User Story: See recent activity on the homepage

**As a** Strapi administrator on an Enterprise edition instance **I want** a "Last activity" widget on the homepage that shows recent audit log entries **so that** I can quickly see who did what most recently.

### Acceptance Criteria

- **Given** I have logged in **When** I view the homepage **Then** a "Last activity" widget is visible **And** the most recent log row is visible **And** the latest row shows an "admin login" action **And** the latest row shows the actor name "test testing".
- **Given** the "Last activity" widget is visible **When** I open Content Manager → Article, edit the "West Ham post match analysis" entry's title to "West Ham pre match pep talk", and Save **Then** I see a "Saved document" confirmation.
- **Given** I have just saved that edit **When** I return to Home **Then** the latest activity row updates to show an "update entry (article)" action **And** the updated latest row still attributes the action to "test testing".
