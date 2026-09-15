# Publish With Draft Relations Warning

> Source: `tests/e2e/tests/content-manager/publish-draft-relations-warning.spec.ts`

## User Story: Warn when publishing an entry whose bidirectional many-to-many relation points to a draft-only entry

**As a** content editor **I want** to be warned when publishing an entry whose many-to-many relation links to a not-yet-published entry **so that** I understand the linked entry won't appear on the live site until it is also published.

### Acceptance Criteria

- **Given** a new Article with its `authors` field linked to the draft-only author "Coach Beard" **When** I click "Publish" **Then** a "Confirmation" dialog appears stating "1 linked entry is still in draft" **And** that it "will appear on the live site once that entry is published" **And** a "Publish" button is shown.
- **Given** the confirmation dialog is shown **When** I click "Cancel" **Then** the dialog closes **And** the "Published" tab stays disabled **And** the "Coach Beard" relation button remains visible on the draft.
- **Given** the confirmation dialog is shown again **When** I click "Publish" **Then** a "Published Document" confirmation appears **And** the "Published" tab becomes enabled.
- **Given** the entry has been published **When** I switch to the "Published" tab **Then** the "Coach Beard" relation button is not shown, because draft relation targets are not listed on the published read-only view.
- **Given** the "Published" tab is shown **When** I switch back to the "Draft" tab **Then** the "Coach Beard" relation button is visible again.

## User Story: Warn when publishing an entry whose oneToMany relation in a dynamic zone points to a draft-only entry

**As a** content editor **I want** to be warned when publishing an entry whose dynamic-zone relation links to a not-yet-published entry **so that** I know that relation will be omitted from the published version.

### Acceptance Criteria

- **Given** the `Shop` single type's "Product carousel - 23/24 kits" component with the draft-only product "Nike Mens 23/24 Away Stadium Jersey" selected **When** I click "Publish" **Then** a "Confirmation" dialog appears stating "This entry is related to 1 draft entry" **And** that it will "not be included in the published version" **And** a "Publish without relations" button is shown.
- **Given** the confirmation dialog is shown **When** I click "Cancel" **Then** the dialog closes without publishing.
- **Given** the confirmation dialog is shown again **When** I click "Publish without relations" **Then** a "Published Document" confirmation appears.
