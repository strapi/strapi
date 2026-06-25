# Preview

> Source: `tests/e2e/tests/content-manager/preview.spec.ts`

## User Story: See and use the preview button for configured content types

**As a** content editor **I want** a preview button on content types that have preview configured **so that** I can view and share a live preview of my content.

### Acceptance Criteria

- **Given** an Article entry **When** I open its edit view **Then** an "Open preview" link is shown.
- **Given** the edit view with an "Open preview" link **When** I click "Open preview" **Then** preview opens in its own page where the draft status and the document heading ("west ham post match") are visible.
- **Given** the preview page **When** I click "Copy preview link" **Then** the link is copied **And** a "Copied preview link" confirmation is shown.
- **Given** the preview page **When** I click "Close preview" **Then** I return to the edit view where the title input is visible.
- **Given** unsaved changes (after editing the title) **When** I view the "Open preview" link **Then** it is disabled **And** hovering it shows the tooltip "please save to open the preview".

## User Story: No preview button for unconfigured content types

**As a** content editor **I want** the preview button hidden for content types without preview configuration **so that** I am not offered a feature that is not available.

### Acceptance Criteria

- **Given** a Product entry (no preview config) **When** I open its edit view **Then** no "Open preview" link is shown.

## User Story: Draft and Published tabs in preview for D&P-enabled content

**As a** content editor **I want** Draft and Published tabs in the preview **so that** I can preview each publication state separately.

### Acceptance Criteria

- **Given** an Article in draft status **When** I open preview for it **Then** both a "Draft" tab and a "Published" tab are visible **And** the "Published" tab is disabled (because the document is in draft status).

## User Story: Preview iframe loads the correct URL per tab

**As a** content editor **I want** the preview iframe to load the correct URL for the current locale and status **so that** the preview reflects exactly the version I am viewing.

### Acceptance Criteria

- **Given** I have published an Article and opened preview **When** I view the Draft tab **Then** a "Preview" iframe is present **And** the iframe `src` matches `/preview/api::article.article/.../en/draft`.
- **Given** the preview on the Draft tab **When** I switch to the "Published" tab **Then** the iframe `src` updates to match `/preview/api::article.article/.../en/published`.

## User Story: Publish from preview with conditional fields without false validation errors

**As a** content editor **I want** to publish from the preview page even when conditional fields exist **so that** hidden conditional fields do not block publication with spurious validation errors.

### Acceptance Criteria

- **Given** an existing Article **When** I open preview for it **Then** an enabled "Publish" button is shown.
- **Given** the enabled "Publish" button **When** I click "Publish" **Then** it succeeds **And** a "published" status notification appears **And** no "There are validation errors in your document" toast appears.

## User Story: Edit and save as draft, modified, or published from preview (EE)

**As a** content editor **I want** to edit the form directly from the preview page and move the document between draft, published, and modified states **so that** I can manage content without leaving the preview.

> Note: This behavior is available only in the Enterprise Edition (EE).

### Acceptance Criteria

- **Given** an Article **When** I open preview for it **Then** the title field shows the current value **And** a draft status **And** the "Draft" tab is selected and enabled **And** the "Published" tab is unselected and disabled.
- **Given** the preview in draft status **When** I edit the title and click "Save" **Then** the document stays in draft status with the new value.
- **Given** the saved draft **When** I click "Publish" **Then** a published status is set **And** the "Published" tab is enabled **And** selecting that tab shows the title field disabled.
- **Given** the published document **When** I return to the "Draft" tab, edit, and save again **Then** a "Modified" status is set with the new value.
- **Given** the modified document **When** I edit again and switch tabs without saving **Then** a "Confirmation" alert dialog opens, which can be cancelled.
