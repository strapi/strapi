# Media Library Drag and Drop - Deep (Sidebar Tree) (Unstable)

> Source: `tests/e2e/tests/media-library/future/drag-drop-deep.spec.ts`

> Note: These behaviors are only tested when the `BETA_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Drag items onto the sidebar folder tree to move them, including into collapsed and nested folders

**As a** content editor managing media **I want** to drag a file or a mixed selection from the table view onto folders in the sidebar tree — including spring-loading a collapsed folder to reveal and drop into its children, or dropping onto Home — while being prevented from moving a folder into its own descendant **so that** I can reorganize my media library by dragging items directly onto the folder hierarchy.

### Acceptance Criteria

- **Given** a folder "Tree Destination" exists and "test-image.jpg" has been uploaded **When** I switch to table view and drag "test-image.jpg" onto the "Tree Destination" row in the sidebar tree **Then** the move succeeds **And** "test-image.jpg" is no longer visible in the current list.
- **Given** "Parent Folder" contains a child "Child Folder", and "test-image.jpg" is uploaded at Home **When** I switch to table view, spring-load the collapsed "Parent Folder" in the sidebar by hovering "test-image.jpg" over it, and then drop the dragged item on "Child Folder" **Then** the move succeeds **And** "test-image.jpg" is no longer visible in the current list.
- **Given** "Nested Home Test" contains "test-image.jpg" **When** I switch to table view and drag "test-image.jpg" onto Home in the sidebar tree **Then** the move succeeds **And** "test-image.jpg" is no longer visible in the current list.
- **Given** "Ancestor" contains a child folder "Descendant" **When** I spring-load "Ancestor" in the sidebar by hovering the "Ancestor" folder itself over it and drop it onto "Descendant" **Then** the "Ancestor" folder remains visible **And** no move-success notification appears (the move is prevented).
- **Given** folders "Multi Dest" and "Selected Folder" both exist and "test-image.jpg" has been uploaded **When** I switch to table view and select both "Selected Folder" and "test-image.jpg" (bulk actions bar visible) and then drag "test-image.jpg" onto "Multi Dest" in the sidebar tree **Then** the move succeeds for the whole selection **And** neither "test-image.jpg" nor "Selected Folder" remain visible in the current list **And** the bulk actions bar is hidden with the selection cleared.
