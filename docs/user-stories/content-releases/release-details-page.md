# Release Details Page

> Source: `tests/e2e/tests/content-releases/release-details-page.spec.ts`

This behavior is only available in the Enterprise Edition (EE). All scenarios start from an existing release named "Trent Crimm: The Independent" opened from the Releases page.

## User Story: Add entries and publish a release

**As a** content manager **I want** to add collection-type and single-type entries to a release and then publish it **so that** I can coordinate publishing multiple entries together.

### Acceptance Criteria

**Scenario: Add a collection-type entry to a release**

- **Given** I am editing the collection-type entry Author "Led Tasso"
- **When** I open "More document actions" -> "Add to release"
- **Then** the "Add to release" dialog opens with the "publish" action radio checked by default
- **And** the "Continue" button is disabled until a release is selected in the "Select a release" combobox, and becomes enabled once a release is chosen
- **And** after confirming, an "Entry added to release" notification is shown

**Scenario: Add a single-type entry to the same release**

- **Given** I am editing the single-type entry "Upcoming Matches"
- **When** I add it to the same release using the same "Add to release" dialog flow
- **Then** the entry is added to the release

**Scenario: Publish the release**

- **Given** the release contains the added entries
- **When** I open the release and click "Publish"
- **Then** the release heading remains visible afterward
- **And** the "Publish" button is no longer visible
- **And** the "Release edit and delete menu" button is no longer visible
- **And** the "publish unpublish" action cell is no longer visible
- **And** the published release shows the message "This entry was published." for its entries

## User Story: Edit and delete a release

**As a** content manager **I want** to rename and delete a release **so that** I can manage releases that are no longer needed or need correcting.

### Acceptance Criteria

**Scenario: Rename a release**

- **Given** I have the release open
- **When** I open "Release edit and delete menu" -> "Edit", change the Name to "Trent Crimm: Independent", and click "Save"
- **Then** the release heading updates to the new name

**Scenario: Delete a release**

- **Given** I have the release open
- **When** I open "Release edit and delete menu" -> "Delete" and click "Confirm"
- **Then** the release is deleted
- **And** I am redirected to the releases page
- **And** the deleted release link is no longer visible

## User Story: Manage entries within a release

**As a** content manager **I want** to regroup entries, change an entry's action, navigate to an entry, and remove entries **so that** I can fine-tune what a release will do before publishing.

### Acceptance Criteria

- By default entries are grouped by content type, showing "Article" and "Author" group separators.
- Changing "Group by" to "Actions" shows "publish" and "unpublish" group separators instead.
- An entry's action can be changed by selecting its action radio; before clicking, the first radio is unchecked and after clicking it is checked.
- Changing a row's action reorders the list so the updated entry ("West Ham post match analysis") becomes the first row after the header.
- A row's "Release action options" -> "Edit entry" navigates to that entry in the content manager, showing the "West Ham post match analysis" heading.
- A row's "Release action options" -> "Remove from release" removes the entry, and the row is no longer visible.
