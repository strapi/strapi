# Media Library Asset Details Drawer (Unstable)

> Source: `tests/e2e/tests/media-library/future/asset-details.spec.ts`

> Note: These behaviors are only tested when the `UNSTABLE_MEDIA_LIBRARY` feature flag is enabled.

## User Story: Open the details drawer and view file info

**As a** content editor managing media **I want** to open an asset's details drawer from either view **so that** I can inspect its file information.

### Acceptance Criteria

- **Given** the table view **When** I click the asset "ted_lasso_profile.jpeg" **Then** the asset details drawer opens **And** shows "File info" and the file name "ted_lasso_profile.jpeg".
- **Given** the asset details drawer is open **When** I close it **Then** it is no longer visible.
- **Given** the grid view **When** I click the "coach_beard_profile.jpg" card **Then** the drawer opens showing "File info" and the file name "coach_beard_profile.jpg".

## User Story: Edit file metadata and move an asset to a folder

**As a** content editor managing media **I want** to rename an asset, edit its alternative text, and move it to a folder from the details drawer **so that** I can organize and describe my media.

### Acceptance Criteria

- **Given** a destination folder "Coaching Staff" is created (success toast shown) and appears after reload **When** I open the details drawer for "ted_lasso_profile.jpeg" from table view **Then** a "Save" button is shown that starts disabled (no changes yet).
- **Given** the details drawer for "ted_lasso_profile.jpeg" is open **When** I edit "File name" to "head_coach_profile.jpeg", edit "Alternative text" to "Head coach Ted Lasso", and select the "Coaching Staff" folder in the Location select **Then** the "Save" button is enabled.
- **Given** the changes have been made in the drawer **When** I save **Then** the changes persist (success toast) **And** the drawer's File name, Alternative text, and Location reflect the saved values after refetch.
- **Given** the asset has been saved into the "Coaching Staff" folder **When** I close the drawer and view the Media Library root in grid view **Then** the asset no longer appears there ("ted_lasso_profile.jpeg" count is 0).
- **Given** the asset has been moved to the "Coaching Staff" folder **When** I navigate into the "Coaching Staff" folder **Then** the renamed "head_coach_profile.jpeg" card is shown.
