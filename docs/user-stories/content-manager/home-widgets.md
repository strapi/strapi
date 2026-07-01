# Homepage Content Manager Widgets

> Source: `tests/e2e/tests/content-manager/home-widgets.spec.ts`

## User Story: See the last edited entries

**As a** content editor **I want** a homepage widget showing my most recently edited entries **so that** I can quickly resume work on what I last touched.

### Acceptance Criteria

- **Given** I am on the homepage **When** I view it **Then** the "last edited entries" widget is visible.
- **Given** the "last edited entries" widget **When** I edit a Products entry (renaming "Nike Mens" to "Nike Mens newer!"), save, and return to the homepage **Then** that entry is shown as the first row in the widget **And** the most recent entry row shows the updated name ("Nike Mens newer!") and a "Draft" status.

## User Story: See the last published entries

**As a** content editor **I want** a homepage widget showing my most recently published entries **so that** I can track what has gone live and whether it has unpublished modifications.

### Acceptance Criteria

- **Given** I am on the homepage **When** I view it **Then** the "last published entries" widget is visible.
- **Given** the "last published entries" widget **When** I publish an Article ("West Ham post match analysis") and return to the homepage **Then** it is shown as the first row with status "Published".
- **Given** the published Article is shown in the widget **When** I modify and save that Article (changing the title to "West Ham pre match pep talk") **Then** the widget's first row still shows the published title ("West Ham post match analysis", not the modified draft) with status "Modified".

## User Story: See published entries per locale

**As a** content editor **I want** the last published entries widget to include entries from different locales **so that** I can see recently published content regardless of language.

### Acceptance Criteria

- **Given** I have created and published an English Article ("West Ham Football Team") and a French Article ("L'équipe de West Ham") **When** I view the homepage "last published entries" widget **Then** both the English and the French entries are shown.

## User Story: See the entries chart widget

**As a** content editor **I want** a chart widget summarizing entry statuses (Draft / Modified / Published) **so that** I can see the distribution of content states at a glance.

### Acceptance Criteria

- **Given** I am on the homepage **When** I view it **Then** the "Entries" chart widget is visible **And** by default the chart shows "Draft" but not "Modified" or "Published".
- **Given** the chart shows the draft arc **When** I focus the draft arc **Then** a tooltip with the draft count is shown.
- **Given** the chart **When** I publish two entries, modify one of them, and return to the homepage **Then** "Draft", "Modified", and "Published" are all visible in the chart **And** the draft tooltip shows a count two less than the initial draft count (because two entries were published) **And** the respective arcs' tooltips report "1 Modified" and "1 Published".
