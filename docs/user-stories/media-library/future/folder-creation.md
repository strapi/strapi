# Media Library Folder Creation (Unstable)

> Source: `tests/e2e/tests/media-library/future/folder-creation.spec.ts`

> Note: These behaviors are only tested when the `UNSTABLE_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Create a folder from the root

**As a** content editor managing media **I want** to create a folder at the library root **so that** I can organize my assets.

### Acceptance Criteria

- **Given** the Media Library root **When** I open the create-folder dialog **Then** the dialog shows the text "New folder in Home".
- **Given** the create-folder dialog is open **When** I fill the name "Test Folder" and click "Create folder" **Then** it succeeds (success toast).
- **Given** the "Test Folder" folder has been created **When** I view grid view **Then** the "Test Folder" folder card is visible.

## User Story: Create a subfolder inside an existing folder

**As a** content editor managing media **I want** to create a folder inside another folder **so that** I can nest my media organization.

### Acceptance Criteria

- **Given** "Parent Folder" has been created and I have navigated into it **When** I open the create-folder dialog **Then** it shows "New folder in Parent Folder".
- **Given** the create-folder dialog inside "Parent Folder" is open **When** I create a "Sub Folder" **Then** it succeeds **And** the "Sub Folder" card is visible inside the parent.

## User Story: Cancel folder creation

**As a** content editor managing media **I want** to cancel creating a folder **so that** no folder is created.

### Acceptance Criteria

- **Given** the create-folder dialog is open **When** I type "Cancelled Folder" and click "Cancel" **Then** the dialog closes **And** the text "Cancelled Folder" is not visible anywhere (no folder was created).

## User Story: Inline error for duplicate folder name

**As a** content editor managing media **I want** an inline error when creating a folder with a duplicate name **so that** I avoid name collisions.

### Acceptance Criteria

- **Given** a folder named "Duplicate" has been created **When** I attempt to create another folder named "Duplicate" **Then** an inline "already exists" error is shown below the input.

## User Story: Form resets when the dialog is reopened

**As a** content editor managing media **I want** the create-folder form to reset on reopen **so that** stale input or errors do not persist.

### Acceptance Criteria

- **Given** I have typed "Some Folder" and cancelled **When** I reopen the dialog **Then** the textbox is empty **And** no alert/error is visible on reopen.
