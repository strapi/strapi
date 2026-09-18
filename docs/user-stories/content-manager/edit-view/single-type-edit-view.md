# Single Type Edit View

> Source: `tests/e2e/tests/content-manager/edit-view/single-type-edit-view.spec.ts`

## User Story: Be warned about draft relations in dynamic zone components when publishing (skipped)

**As a** content editor **I want** to be warned when publishing a single type whose dynamic-zone components reference draft relations **so that** I avoid publishing content linked to unpublished entries.

> Note: This test is marked `test.fixme` (skipped) due to a known bug with the draft relations check. Documented for completeness; it does not currently run.

### Acceptance Criteria (as specified, not currently enforced)

**Scenario: Publishing a single type with draft relations in a dynamic-zone component warns about them**

- **Given** the `Shop` single type with the "Product carousel - 23/24 kits" component opened and the "Nike Mens 23/24 Away Stadium" draft product added
- **When** I click "Publish"
- **Then** a warning "This entry is related to 1" should be shown
- **When** I cancel the warning and save the entry
- **And** I publish again
- **Then** the warning "This entry is related to 1" should still be shown

## User Story: Create and publish a single type at the same time, then modify and save it

**As a** content editor **I want** to publish the Homepage single type in one action, then modify and save it **so that** I can publish and continue editing.

### Acceptance Criteria

**Scenario: Publish the Homepage single type in one action, then modify and save it**

- **Given** I open the `Homepage`
- **Then** its heading and an enabled "More actions" button are shown
- **And** Draft and Published tabs exist; Draft is selected and enabled, Published is not selected and disabled
- **And** "Save" and "Publish" start disabled
- **When** I fill `title` with "Welcome to AFC Richmond" and click "Publish"
- **Then** a "Published Document" confirmation appears
- **And** the Draft tab stays selected and the Published tab becomes enabled
- **When** I select the Published tab
- **Then** Save and Publish are disabled
- **When** I return to Draft
- **Then** Save and Publish remain disabled while "More document actions" is enabled
- **And** in that menu "Unpublish" is enabled and "Discard changes" is disabled
- **When** I fill the content block and click "Save"
- **Then** a "Saved Document" confirmation and a "Modified" status are shown

## User Story: Create a single type, then modify it

**As a** content editor **I want** to save the Homepage single type and then modify it **so that** I can build it up incrementally.

### Acceptance Criteria

**Scenario: Save the Homepage single type and then modify it**

- **Given** I open the `Homepage`
- **Then** its heading, an enabled "More actions" button, and the Draft/Published tabs (Draft selected/enabled, Published disabled) are shown
- **And** "Save" and "Publish" start disabled
- **When** I fill `title` with "Welcome to AFC Richmond" and click "Save"
- **Then** a "Saved Document" confirmation appears; Draft stays selected/enabled and Published stays disabled
- **And** the heading updates to "Welcome to AFC Richmond" (the `mainField`) and "Homepage" is no longer shown
- **And** "Save" is disabled and "Publish" is enabled
- **When** I fill the content block
- **Then** "Save" is re-enabled
- **When** I save
- **Then** a "Saved Document" confirmation is shown
- **And** Draft remains selected/enabled, Published stays disabled, and the "Modified" status is not shown

## User Story: Discard changes on a single type

**As a** content editor **I want** to discard unsaved changes on the Shop single type **so that** I can revert to the last saved state.

### Acceptance Criteria

**Scenario: Discard unsaved changes on the Shop single type**

- **Given** I open `Shop`
- **When** I click "Publish"
- **Then** a "Published Document" confirmation is shown
- **And** the "Discard changes" menu item is disabled immediately after publishing
- **When** I edit the title to "International Shop" and save
- **Then** a "Saved Document" confirmation is shown
- **And** "Discard changes" becomes enabled
- **When** I click "Discard changes" and confirm
- **Then** a "Changes discarded" confirmation is shown and the heading reverts to "UK Shop"

## User Story: Unpublish a single type

**As a** content editor **I want** to unpublish the Shop single type **so that** it is no longer publicly available.

### Acceptance Criteria

**Scenario: Unpublish the Shop single type**

- **Given** I open `Shop`
- **Then** the Draft tab is selected/enabled and the Published tab is not selected and disabled
- **When** I click "Publish"
- **Then** "Published Document" is shown and the Published tab is enabled
- **When** I open "More document actions" and click "Unpublish" (which is enabled)
- **Then** an "Unpublished Document" confirmation is shown
- **And** the Draft tab is selected/enabled and the Published tab is disabled again

## User Story: Add a component to a dynamic zone at a specific position

**As a** content editor **I want** to insert dynamic-zone components above or below existing components **so that** I control the ordering of the page layout.

### Acceptance Criteria

**Scenario: Insert dynamic-zone components above and below existing ones**

- **Given** the `UK Shop` entry starts with three dynamic-zone components: product carousel, content and image, product carousel (in that order)
- **When** I insert a "product carousel" below the "content and image" component
- **Then** the count becomes 4
- **When** I insert a "hero image" above the "product carousel - 23/24 kits" component
- **Then** the count becomes 5
- **When** I insert a "hero image" below the "product carousel - 23/24 kits" component
- **Then** the count becomes 6
- **And** the final order of the six components is: hero image, product carousel, hero image, content and image, product carousel, product carousel
