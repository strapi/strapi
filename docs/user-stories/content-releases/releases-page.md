# Releases Page

> Source: `tests/e2e/tests/content-releases/releases-page.spec.ts`

This behavior is only available in the Enterprise Edition (EE).

## User Story: Create an unscheduled release and view pending/done releases

**As a** content manager **I want** to create a release without scheduling it and browse my pending and done releases **so that** I can prepare releases to publish manually later.

### Acceptance Criteria

- **Given** the Releases page is open **When** the user views the list **Then** the existing pending release "Trent Crimm: The Independent" is shown **And** the "Done" tab shows the completed release "Nate: A wonder kid".
- **Given** the Releases page is open **When** the user clicks "New release" **Then** a "New release" dialog opens.
- **Given** the "New release" dialog is open **When** the user fills the Name ("The Diamond Dogs"), unchecks "Schedule release", and clicks "Continue" **Then** the release is created **And** the user is redirected to its detail page where the new release name appears as a heading.
- **Given** the release has been created **When** the user returns to the Releases page **Then** the newly created release is shown in the list.

## User Story: Create a scheduled release

**As a** content manager **I want** to create a release with a scheduled date and time **so that** it can be published automatically at the chosen moment.

### Acceptance Criteria

- **Given** the Releases page is open **When** the user clicks "New release" **Then** a "New release" dialog opens.
- **Given** the "New release" dialog is open **When** the user fills the Name ("The Diamond Dogs"), selects a date one day in the future, selects the time "08:00", and clicks "Continue" **Then** the release is created **And** the user is redirected to its detail page where the new release name appears as a heading.
- **Given** the scheduled release has been created **When** the user returns to the Releases page **Then** the newly created scheduled release is shown in the list.

## User Story: Bulk add entries to a release

**As a** content manager **I want** to add multiple entries to a release at once from the content manager list view **so that** I can build a release quickly without adding entries individually.

### Acceptance Criteria

- **Given** the Releases page is open **When** the user creates a new unscheduled release ("The Diamond Dogs") **Then** its detail page can be opened.
- **Given** the release detail page is open **When** the user clicks "Open the Content Manager" **Then** the user navigates to a collection-type list view (Article).
- **Given** the Article list view is open **When** the user selects all entries via "Select all entries" and triggers the "add to release" bulk action **Then** a dialog opens.
- **Given** the "add to release" dialog is open **When** the user selects the release "The Diamond Dogs" and the "unpublish" action then clicks "continue" **Then** a "Successfully added to release." message is shown.
- **Given** entries have been added to the release **When** the user views the content manager list view **Then** the release column shows "1 release" for the affected entries **And** clicking it reveals "The Diamond Dogs".

## User Story: Hide "add to release" for content types without draft & publish

**As a** content manager **I want** the "add to release" bulk action to be hidden for content types that have draft & publish disabled **so that** I am not offered release actions that do not apply.

### Acceptance Criteria

- **Given** the Article list view is open **When** the user publishes all articles in bulk (select all -> "Publish" -> confirm in the "Confirmation" dialog) **Then** a "Published document" notification is shown **And** the articles are not deleted when draft & publish is later disabled.
- **Given** the Article content type exists **When** draft & publish is disabled via the Content-Type Builder (Edit -> Advanced settings -> "Draft & publish" -> confirm "disable" -> "Finish" -> "Save") **Then** the server restarts.
- **Given** draft & publish is disabled for the Article content type **When** the user returns to the Article list view in the content manager and selects all entries **Then** the "add to release" bulk action button is not visible.
