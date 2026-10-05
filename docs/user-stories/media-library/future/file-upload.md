# Media Library File Upload (Unstable)

> Source: `tests/e2e/tests/media-library/future/file-upload.spec.ts`

> Note: These behaviors are only tested when the `UNSTABLE_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Upload a single file via the file picker

**As a** content editor managing media **I want** to upload a file with the file picker **so that** I can add media to the library and see upload progress.

### Acceptance Criteria

- **Given** the Media Library **When** I upload a file via the file picker **Then** the upload progress dialog appears and reaches success.
- **Given** the upload progress dialog has reached success **When** I close it **Then** it is no longer visible.

## User Story: Upload multiple files

**As a** content editor managing media **I want** to upload several files at once **so that** I can add them in a single operation.

### Acceptance Criteria

- **Given** the Media Library **When** I upload two files via the file picker **Then** the upload progress dialog reaches success **And** the dialog shows the message "2 files uploaded successfully".
- **Given** the upload progress dialog has reached success **When** I close it **Then** the dialog is closed.

## User Story: Uploaded file appears in the table view

**As a** content editor managing media **I want** an uploaded file to appear in the assets table **so that** I can confirm it was added.

### Acceptance Criteria

- **Given** table view and a file has been uploaded with the progress dialog reaching success and being closed **When** I view the table **Then** the "test-image" asset row is visible.

## User Story: Upload a file via drag and drop

**As a** content editor managing media **I want** to drag and drop a file into the library **so that** I can upload without using the picker.

### Acceptance Criteria

- **Given** table view **When** I drop a file **Then** the upload progress dialog reaches success **And** can be closed.
- **Given** the dropped file has been uploaded and the dialog closed **When** I view the table **Then** the "test-image" asset row is visible.

## User Story: Upload a file from a URL

**As a** content editor managing media **I want** to upload an asset from a URL **so that** I can import remote media.

### Acceptance Criteria

- **Given** the Media Library **When** I upload an asset from a URL **Then** the upload progress dialog reaches success.
- **Given** the upload progress dialog has reached success **When** I close it **Then** it is no longer visible.
