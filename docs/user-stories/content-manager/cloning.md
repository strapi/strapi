# Cloning

> Source: `tests/e2e/tests/content-manager/cloning.spec.ts`

## User Story: Auto-clone a document with no blocking fields

**As a** content editor **I want** to duplicate a document directly from the list view **so that** I can quickly create a copy when the document has no unique fields or relation types that block cloning.

### Acceptance Criteria

- **Given** the Author list view **When** I view the entries **Then** I see a single "Coach Beard" row.
- **Given** a "Coach Beard" row **When** I open its "Row actions" menu and click "Duplicate" **Then** the document is cloned **And** a "Cloned document" confirmation appears.
- **Given** the document has been cloned **When** I land on the edit view of the new (already saved) cloned document **Then** the heading shows "Coach Beard" **And** the "Save" button is disabled **And** the "Publish" button is enabled.
- **Given** the cloned document **When** I return to the Author list view **Then** two "Coach Beard" rows are shown.

## User Story: Auto-clone a document in a non-default locale

**As a** content editor **I want** to duplicate a document while working in a non-default locale **so that** I can clone localized entries (e.g. Spanish) the same way as default-locale entries.

### Acceptance Criteria

- **Given** the Team list view **When** I switch the locale selector to "Spanish (es)" **Then** I am working in the Spanish locale.
- **Given** the Spanish locale **When** I create a new Team entry ("FC Barcelona", founded "1899") and publish it **Then** a "Published" confirmation appears.
- **Given** the published Team entry **When** I return to the list view **Then** at least one "FC Barcelona" row is visible.
- **Given** an "FC Barcelona" row **When** I open its "Row actions" menu and click "Duplicate" **Then** the entry is cloned **And** a "Cloned document" confirmation appears.
- **Given** the entry has been cloned **When** I land on the edit view of the new cloned document **Then** the heading shows "FC Barcelona" **And** the "Save" button is disabled **And** the "Publish" button is enabled.

## User Story: Clone an entry that has blocking fields (relations / unique slug)

**As a** content editor **I want** to be guided through cloning an entry that cannot be auto-cloned **so that** I can resolve conflicting unique fields before saving the copy.

### Acceptance Criteria

- **Given** the Article list view **When** I view the entries **Then** I see a single "West ham post match analysis" row.
- **Given** an entry with a unique UID slug **When** I open its "Row actions" menu and click "Duplicate" **Then** a message "This entry can't be duplicated directly." is shown.
- **Given** the entry can't be duplicated directly **When** the "Duplicate" dialog is shown **Then** it has a heading "Duplicate" **And** a "Cancel" button **And** a "Create" link **And** the conflicting "slug" field listed.
- **Given** the "Duplicate" dialog **When** I click "Create" **Then** I am taken to the clone edit route where the "Save" button is enabled **And** the "Publish" button is disabled (publish & create is not supported on clone routes).
- **Given** the clone edit route **When** I clear and set a new unique slug ("hammers-post-match-analysis") and click "Save" **Then** a "Cloned document" confirmation appears **And** I land on the entry's edit view.
- **Given** the entry has been cloned **When** I return to the Article list view **Then** two "West ham post match analysis" rows are shown.
