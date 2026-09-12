# Relations on the Fly - Edit a Relation

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/edit-relation.spec.ts`

## User Story: Edit an existing relation in a modal, save and publish it

**As a** content editor **I want** to edit a related document inline, save it as a draft, and publish it **so that** relation changes are reflected on the parent document.

### Acceptance Criteria

**Scenario: Edit a relation inline, save it as a draft, and publish it**

- **Given** an `Article` ("West Ham post match analysis")
- **When** I open the "Coach Beard" relation
- **Then** the "Edit a relation" modal is shown with `name` pre-filled as "Coach Beard"
- **When** I change `name` to "Mr. Coach Beard" and click "Save"
- **Then** the value is kept and a "Draft" status is shown
- **When** I click "Publish"
- **Then** the value is kept and a "Published" status is shown
- **When** I close the modal
- **Then** "Mr. Coach Beard" is shown as a related author button on the parent Article

## User Story: Edit an existing relation and open it in full page

**As a** content editor **I want** to open an existing relation in a full-page edit view **so that** I can edit it with more space.

### Acceptance Criteria

**Scenario: Open an existing relation in a full-page edit view**

- **Given** I open the "Coach Beard" relation
- **Then** the "Edit a relation" modal is shown
- **When** I click "Go to entry"
- **Then** I navigate to the author edit URL and the "Coach Beard" heading is shown

## User Story: Open a blocks editor modal on top of a relation modal

**As a** content editor **I want** to expand a blocks editor field while inside a relation modal **so that** I can edit rich content within a nested relation.

### Acceptance Criteria

**Scenario: Expand a blocks editor field inside a relation modal**

- **Given** I open an `Author` ("Coach Beard") and then a nested "West Ham post match analysis" relation
- **Then** the "Edit a relation" modal is shown
- **When** I click "Expand"
- **Then** the blocks editor modal opens showing the content "Howdy"
- **And** a "Collapse" button is available, confirming the blocks editor modal is open

## User Story: Navigate nested relations and use the Back button

**As a** content editor **I want** to open nested relations and step back through them with the Back button **so that** I can navigate the relation stack.

### Acceptance Criteria

**Scenario: Navigate nested relations with the Back button**

- **Given** I open the "Coach Beard" relation
- **Then** the "Back" button is disabled (top of the stack)
- **When** I open a nested "West Ham post match analysis" relation
- **Then** the "Back" button is enabled
- **When** I open a further nested "Coach Beard" relation
- **Then** "Back" stays enabled
- **When** I click "Back"
- **Then** I return to "West Ham post match analysis" (Back still enabled)
- **When** I click "Back" again
- **Then** I return to "Coach Beard" (Back disabled again)

## User Story: Open a nested relation without saving prompts a confirmation

**As a** content editor **I want** to confirm before opening a nested relation with unsaved data **so that** I do not lose my changes.

### Acceptance Criteria

**Scenario: Opening a nested relation with unsaved data prompts a confirmation**

- **Given** I have opened the "Coach Beard" relation and changed `name` to "Mr. Coach Beard"
- **When** I open the nested "West Ham post match analysis" relation
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** the "West Ham post match analysis" heading is shown

## User Story: Closing the relation modal without saving prompts a confirmation

**As a** content editor **I want** to confirm before closing a relation modal with unsaved data **so that** I do not lose my changes.

### Acceptance Criteria

**Scenario: Closing the relation modal with unsaved data prompts a confirmation**

- **Given** I have opened "Coach Beard" and changed `name` to "Mr. Coach Beard"
- **When** I click "Close modal"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I return to the "West Ham post match analysis" view

## User Story: Opening full page without saving prompts a confirmation

**As a** content editor **I want** to confirm before opening the full-page view with unsaved data **so that** I do not lose my changes.

### Acceptance Criteria

**Scenario: Opening the full-page view with unsaved data prompts a confirmation**

- **Given** I have opened "Coach Beard" and changed `name` to "Mr. Coach Beard"
- **When** I click "Go to entry"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I navigate to the author edit URL and the "Coach Beard" heading is shown

## User Story: Clicking Back without saving prompts a confirmation

**As a** content editor **I want** to confirm before going back to a previous relation with unsaved data **so that** I do not lose my changes.

### Acceptance Criteria

**Scenario: Clicking Back with unsaved data prompts a confirmation**

- **Given** I have opened "Coach Beard", a nested "West Ham post match analysis", and a further nested "Coach Beard", and changed `name` to "Mr. Coach Beard"
- **When** I click "Back"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I return to the "West Ham post match analysis" view

## User Story: Open a relation inside a dynamic zone component

**As a** content editor **I want** to open and edit a relation that lives inside a dynamic-zone component **so that** I can manage component relations inline.

### Acceptance Criteria

**Scenario: Open and edit a relation inside a dynamic-zone component**

- **Given** the `Shop` single type with the "Product carousel" component opened
- **When** I select "Nike Mens 23/24 Away Stadium Jersey" in the `products` combobox and open that relation
- **Then** the "Edit a relation" modal is shown with the "Nike Mens 23/24 Away Stadium Jersey" heading

## User Story: Add a relation, change its name and status, and see changes reflected in the edit view

**As a** content editor **I want** to add a relation, publish it with a new name from the modal, and see the change in the parent edit view **so that** the parent reflects the updated relation state.

### Acceptance Criteria

**Scenario: Publish a relation with a new name from the modal and see it reflected in the parent edit view**

- **Given** an `Article` ("West Ham post match analysis")
- **When** I add "Led Tasso" via the `authors` combobox
- **Then** it is shown as a button with a "Draft" status ("Led TassoDraft")
- **When** I open that relation, change `name` to "Mr. Led Tasso", and click "Publish"
- **Then** the value is kept and a "Published" status is shown
- **When** I close the modal
- **Then** "Mr. Led Tasso" is shown as a button and the text "Mr. Led TassoPublished" is shown in the edit view
