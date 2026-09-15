# Media Library Drag and Drop - Shallow (In-List Folders) (Unstable)

> Source: `tests/e2e/tests/media-library/future/drag-drop-shallow.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Drag items onto folders shown within the current list to move them

**As a** content editor managing media **I want** to drag a file or a folder onto another folder row/card shown in the current table or grid view **so that** I can reorganize my media library without opening a move dialog, while being prevented from dropping a folder onto itself.

### Acceptance Criteria

- **Given** a folder "Destination" exists and "test-image.jpg" has been uploaded **When** I switch to table view and drag "test-image.jpg" onto the "Destination" row **Then** the move succeeds **And** "test-image.jpg" is no longer visible in the list **And** the "Destination" folder row remains visible.
- **Given** a folder "Grid Destination" exists and "test-image.jpg" has been uploaded **When** I switch to grid view and drag "test-image.jpg" onto the "Grid Destination" card **Then** the move succeeds **And** the "test-image.jpg" card is no longer visible.
- **Given** folders "Target Folder" and "Movable Folder" both exist **When** I switch to table view and drag "Movable Folder" onto "Target Folder" **Then** the move succeeds **And** the "Movable Folder" row is no longer visible.
- **Given** folders "Grid Target" and "Grid Movable" both exist **When** I switch to grid view and drag "Grid Movable" onto "Grid Target" **Then** the move succeeds **And** the "Grid Movable" card is no longer visible.
- **Given** a folder "Self Folder" exists **When** I switch to table view and drag "Self Folder" onto itself **Then** the "Self Folder" row remains visible **And** no move-success notification appears (the move is prevented).
- **Given** a folder "Toast Target" exists and "test-image.jpg" has been uploaded **When** I switch to grid view and drag "test-image.jpg" onto "Toast Target" **Then** a move-success notification is shown **And** the "test-image.jpg" card is removed from the current view.
