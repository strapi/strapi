# Homepage Content Releases Widgets

> Source: `tests/e2e/tests/content-releases/home-widgets.spec.ts`

## User Story: View upcoming releases on the homepage

**As a** content manager **I want** an "Upcoming releases" widget on the homepage **so that** I can see scheduled and pending releases and their status at a glance.

> Note: This behavior is only available in the Enterprise Edition (EE).

### Acceptance Criteria

**Scenario: The Upcoming releases widget lists an existing release**

- **Given** I am on the homepage
- **When** the homepage loads
- **Then** an "Upcoming releases" widget is shown
- **And** the widget lists the existing not-scheduled release "Trent Crimm: The Independent" with a "Not scheduled" status

**Scenario: A newly created scheduled release with no entries shows as Empty**

- **Given** I am on the Releases page
- **When** I click "New release", fill the name, select a date one day in the future, select a time two hours ahead, and click "Continue"
- **Then** a "Release created" notification is shown
- **And** after returning to the homepage, the newly created scheduled release appears in the widget with an "Empty" status because it has no entries

**Scenario: Adding an entry changes the release status to Blocked**

- **Given** the newly created scheduled release exists and shows an "Empty" status in the widget
- **When** I add a new "Cat" entry with age "1" to the scheduled release via "More document actions" -> "Add to release" -> select release -> "Continue"
- **Then** an "Entry added to release" notification is shown
- **And** after returning to the homepage, the scheduled release's status updates from "Empty" to "Blocked"
