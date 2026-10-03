# Review Workflows Home Widget

> Source: `tests/e2e/tests/review-workflows/home.spec.ts`

> Note: These behaviors are only tested in the Enterprise Edition (EE).

## User Story: See the entries assigned to me on the home page

**As a** content manager / reviewer **I want** to see entries assigned to me in a home page widget **so that** I can quickly find my pending work.

### Acceptance Criteria

- **Given** the home page is open **Then** the "Assigned to me" widget is visible.
- **Given** the "West Ham" Article entry is open **When** it is assigned to the current user ("test testing") **Then** "Assignee updated" is shown.
- **Given** the "West Ham" Article has been assigned to the current user **When** returning to the home page **Then** the assigned entry appears as the first row in the "Assigned to me" widget **And** the row shows a gridcell for the "West Ham" entry **And** a "draft" status gridcell.
