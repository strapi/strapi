# Relations on the Fly - Create a Relation

> Source: `tests/e2e/tests/content-manager/relations-on-the-fly/create-relation.spec.ts`

## User Story: Create a new relation in a modal and open it in full page

**As a** content editor **I want** to open a newly created relation in a full-page edit view **so that** I can edit it with more space.

### Acceptance Criteria

**Scenario: Open a newly created relation in a full-page edit view**

- **Given** an `Article` ("West Ham post match analysis")
- **When** I open the `authors` combobox and choose "Create a relation"
- **Then** the "Create a relation" modal is shown
- **When** I click "Go to entry"
- **Then** I navigate to the author create URL and the "Create an entry" heading is shown

## User Story: Open a nested relation without saving prompts a confirmation

**As a** content editor **I want** to be warned with a confirmation when navigating to a nested new relation with unsaved data **so that** I do not lose my form changes unintentionally.

### Acceptance Criteria

**Scenario: Opening a nested new relation with unsaved data prompts a confirmation**

- **Given** the create relation modal with `name` filled with "Mr. Coach Hair"
- **When** I open the `articles` combobox and choose "Create a relation"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** the nested "Create a relation" modal opens with an "Untitled" heading and a disabled "Back" button

## User Story: Add and edit a nested relation without saving prompts a confirmation

**As a** content editor **I want** to be warned when editing an existing nested relation with unsaved data **so that** I do not lose my changes.

### Acceptance Criteria

**Scenario: Editing an existing nested relation with unsaved data prompts a confirmation**

- **Given** the create relation modal with `name` filled with "Mr. Coach Hair"
- **When** I open the `articles` combobox, select "West Ham post match analysis", and open it
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** the nested "Edit a relation" modal opens with a "West Ham post match analysis" heading and a disabled "Back" button

## User Story: Closing the relation modal without saving prompts a confirmation

**As a** content editor **I want** to confirm before closing a relation modal with unsaved data **so that** I do not lose my form changes.

### Acceptance Criteria

**Scenario: Closing the relation modal with unsaved data prompts a confirmation**

- **Given** the create relation modal with `name` filled with "Mr. Coach Hair"
- **When** I click "Close modal"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I return to the parent "West Ham post match analysis" view

## User Story: Opening full page without saving prompts a confirmation

**As a** content editor **I want** to confirm before navigating to the full-page view with unsaved data **so that** I do not lose my form changes.

### Acceptance Criteria

**Scenario: Navigating to the full-page view with unsaved data prompts a confirmation**

- **Given** the create relation modal with `name` filled with "Mr. Coach Hair"
- **When** I click "Go to entry"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I navigate to the author create URL and the "Create an entry" heading is shown

## User Story: Clicking Back without saving prompts a confirmation

**As a** content editor **I want** to confirm before going back to a previous relation with unsaved data **so that** I do not lose my form changes.

### Acceptance Criteria

**Scenario: Clicking Back with unsaved data prompts a confirmation**

- **Given** from an Article, I have opened the "Coach Beard" relation, then a nested "West Ham post match analysis" relation, then opened the `authors` combobox and chosen "Create a relation", and filled `name` with "Mr. Coach Hair"
- **When** I click "Back"
- **Then** a confirmation modal is shown
- **When** I confirm
- **Then** I return to the "West Ham post match analysis" view
