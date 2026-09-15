# Collection Type Edit View

> Source: `tests/e2e/tests/content-manager/edit-view/collection-type-edit-view.spec.ts`

## User Story: Be warned about draft relations when publishing (skipped)

**As a** content editor **I want** to be warned when publishing content that references draft relations **so that** I do not unintentionally publish content linked to unpublished entries.

> Note: This test is marked `test.fixme` (skipped) due to a known bug with the draft relations check. It is documented for completeness but does not currently run.

### Acceptance Criteria (as specified, not currently enforced)

**Scenario: Publishing an Article with draft relations warns about them**

- **Given** a new Article with a draft relation "Coach Beard" added
- **When** I click "Publish"
- **Then** a warning "This entry is related to 1" should be shown
- **When** I cancel the warning and save the entry
- **And** I add a second draft relation "Led Tasso" and publish
- **Then** the warning "This entry is related to 2" should be shown
- **When** I save again and publish once more
- **Then** the warning "This entry is related to 3" should still be displayed

## User Story: Create and publish a document at the same time, then modify and save it

**As a** content editor **I want** to create and publish an Article in one action, then modify and save it **so that** I can publish quickly and continue editing afterward.

### Acceptance Criteria

**Scenario: Create and publish an Article in one action, then modify and save it**

- **Given** I open the create edit view for an Article
- **Then** the "Create an entry" heading and an enabled "More actions" button are shown
- **And** two tabs are shown: "Draft" (selected by default, enabled) and "Published" (not selected, disabled)
- **And** before any input, the "Save", "Publish", and "More document actions" buttons are disabled
- **When** I fill `title` with "Being from Kansas City" and click "Publish"
- **Then** a "Published Document" confirmation appears
- **And** the "Draft" tab stays selected and the "Published" tab becomes enabled
- **When** I select the "Published" tab
- **Then** "Save" and "Publish" are disabled
- **When** I return to the "Draft" tab
- **Then** "Save" and "Publish" remain disabled while "More document actions" is enabled
- **And** in "More document actions", "Unpublish" is enabled and "Discard changes" is disabled
- **And** the new entry "Being from Kansas City" appears as a gridcell in the list view
- **When** I reopen it and add a draft author "Led Tasso" via the `authors` combobox
- **Then** the author shows as a button
- **When** I save
- **Then** a "Saved Document" confirmation appears followed by a "Modified" status

## User Story: Create a document, then modify it

**As a** content editor **I want** to create a draft Article, then modify it including via keyboard shortcuts **so that** I can edit efficiently.

### Acceptance Criteria

**Scenario: Create a draft Article, then modify it including via keyboard shortcuts**

- **Given** I open the create edit view for an Article
- **Then** "Create an entry" and an enabled "More actions" button are shown, with Draft/Published tabs behaving as above (Draft selected/enabled, Published disabled)
- **And** the Save, Publish, and More document actions buttons start disabled
- **When** I fill `title` with "Being from Kansas City" and click "Save"
- **Then** a "Saved Document" confirmation appears and the Draft tab remains selected/enabled while Published stays disabled
- **And** the page heading updates to the saved title "Being from Kansas City" (the content-type `mainField`), and "Create an entry" is no longer shown
- **And** "Save" is disabled and "Publish" is enabled
- **When** I edit the title to "Being an American", fill the content block, and add the draft author "Led Tasso"
- **Then** "Save" is re-enabled
- **When** I save
- **Then** a "Saved Document" confirmation appears
- **When** I edit the title and press Enter
- **Then** a "Saved Document" confirmation appears and the "Modified" status is not shown afterward
- **When** I press Control+Enter
- **Then** the document publishes, producing a "Published Document" confirmation
- **And** the entry "Being an American" appears in the list view, and reopening it shows the "Being an American" heading

## User Story: Discard changes

**As a** content editor **I want** to discard unsaved changes on a published document **so that** I can revert to the last saved state.

### Acceptance Criteria

**Scenario: Discard unsaved changes on a published document**

- **Given** I open "West Ham post match analysis"
- **When** I click "Publish"
- **Then** a "Published Document" confirmation is shown
- **And** the "Discard changes" menu item is disabled immediately after publishing
- **When** I edit the title to "West Ham vs Richmond AFC" and save
- **Then** a "Saved Document" confirmation is shown
- **And** the "Discard changes" menu item becomes enabled
- **When** I click "Discard changes" and confirm
- **Then** a "Changes discarded" confirmation is shown

## User Story: Unpublish a document

**As a** content editor **I want** to unpublish a published document **so that** it is no longer publicly available.

### Acceptance Criteria

**Scenario: Unpublish a published document**

- **Given** I open "West Ham post match analysis"
- **Then** the Draft tab is selected and enabled and the Published tab is not selected
- **When** I click "Publish"
- **Then** "Published Document" is shown and the Published tab is enabled
- **When** I open "More document actions" and click "Unpublish" (which is enabled)
- **Then** an "Unpublished Document" confirmation is shown
- **And** the Draft tab is selected/enabled and the Published tab is disabled again

## User Story: Delete a document

**As a** content editor **I want** to delete a document across all locales **so that** the entry is removed from the database.

### Acceptance Criteria

**Scenario: Delete a document across all locales**

- **Given** I open "West Ham post match analysis"
- **When** I use "More actions", choose "Delete entry (all locales)", and confirm
- **Then** a "Deleted Document" confirmation is shown
- **And** I am returned to the list view and the "West Ham post match analysis" gridcell is no longer visible
