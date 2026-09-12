# Content History (EE)

> Source: `tests/e2e/tests/content-manager/history.spec.ts`

> Note: These behaviors are available only in the Enterprise Edition (EE).

## User Story: Restore a previous history version

**As a** content editor **I want** to restore an earlier version of a document from its history **so that** I can revert unwanted changes.

### Acceptance Criteria

- **Given** an entry ("Being from Kansas") that was then edited ("Being from Florida") and saved each time **When** I open the history page **Then** multiple history versions exist **And** I see a list of "Version card" items.
- **Given** the list of version cards **When** I select the oldest version card **Then** the title field shows the original value ("Being from Kansas").
- **Given** the oldest version is selected **When** I click "Restore" and confirm "Restore" in the "Confirmation" alert dialog **Then** the document is reverted **And** the title field holds the restored value ("Being from Kansas").

## User Story: Track collection-type versions across create / edit / publish / modify

**As a** content editor **I want** every create, edit, publish, and modify action on a collection-type entry to create a tracked history version per locale **so that** I can review how the entry changed over time and which versions belong to which locale.

### Acceptance Criteria

- **Given** the history page **When** I create a French Article ("N'importe quoi") **Then** a version with that title is visible on the history page.
- **Given** a French Article exists **When** I create a separate English Article ("Being from Kansas is a pity") **Then** exactly one version card is shown for the English locale **And** the URL gains an `id=<number>` **And** the most recent version is marked "(current)" and "Draft" **And** the title field is disabled and holds the English value **And** the French title is not visible.
- **Given** the English Article **When** I update the entry ("Being from Kansas City") **Then** 2 version cards are produced **And** the current version holds the updated value **And** selecting the previous card shows the prior value ("Being from Kansas is a pity") and is not marked "(current)".
- **Given** the updated entry **When** I publish it **Then** 3 version cards are produced **And** the current version is labelled "Published" with the latest value **And** selecting the previous version still shows the latest value.
- **Given** the published entry **When** I modify it after publish ("Being from Kansas City, Missouri") **Then** 4 version cards are produced **And** the current version is labelled "Modified" with the modified value.

## User Story: See relations in history and detect missing relations (collection type)

**As a** content editor **I want** the history view to show an entry's relations and warn when a related entry has been deleted **so that** I understand which relations existed at a given version and which are now missing.

### Acceptance Criteria

- **Given** I have created an Author ("Will Kitman") **When** I create an Article ("Zava retires"), add both "Will Kitman" and "Coach Beard" as Authors, and save **Then** the relations are saved.
- **Given** the saved Article with both Authors **When** I delete the "Will Kitman" author entry and open the Article's history page **Then** the remaining "Coach Beard" relation is shown as a link **And** "Will Kitman" is no longer shown **And** a "missing relation" message is displayed.

## User Story: See renamed fields as unknown/new fields in history (collection type)

**As a** content editor **I want** history versions to flag fields that were renamed (deleted + recreated) in the Content-Type Builder **so that** I can tell which historical fields no longer exist and which fields are new.

### Acceptance Criteria

- **Given** the history feature **When** I create an Article ("Being from Kansas", slug "being-from-kansas") **Then** an initial version is created.
- **Given** the Article exists **When** I rename the "title" field to "titleRename" in the Content-Type Builder and wait for restart **Then** the renamed field is shown in the edit view.
- **Given** the renamed field **When** I update the entry ("Being from Kansas City") **Then** a second version is created.
- **Given** the second version exists **When** I select the previous version on the history page **Then** an "Unknown fields" section containing the old "title" field with its original value ("Being from Kansas") is shown **And** the new "titleRename" field is shown as a "New field".

## User Story: Track single-type versions across create / edit / publish / modify

**As a** content editor **I want** create, edit, publish, and modify actions on a single-type entry to create tracked history versions per locale **so that** I can review the single type's change history by locale and publication state.

### Acceptance Criteria

- **Given** the history page **When** I create a French Homepage ("Paris Saint-Germain") **Then** a version is visible on the history page.
- **Given** a French Homepage exists **When** I create the English Homepage ("AFC Richmond") **Then** exactly one version card is shown **And** the URL gains an `id=<number>` **And** the current version is marked "(current)" and "Draft" **And** the title field is disabled and holds the English value **And** the French title is not visible.
- **Given** the English Homepage **When** I update it ("Welcome to AFC Richmond") **Then** 2 version cards are produced **And** the previous card shows the prior value ("AFC Richmond").
- **Given** the updated Homepage **When** I publish it **Then** 3 version cards are produced **And** the current version is labelled "Published" with the latest value **And** the previous card is labelled "Draft".
- **Given** the published Homepage **When** I modify it after publish ("Welcome to AFC Richmond!") **Then** 4 version cards are produced **And** the current version is labelled "Modified".

## User Story: See relations in history and detect missing relations (single type)

**As a** content editor **I want** the single-type history view to show relations and warn about deleted related entries **so that** I can detect missing relations on single types.

### Acceptance Criteria

- **Given** the Content-Type Builder **When** I add an "authors" relation (Homepage has many Authors) and wait for restart **Then** the relation is available.
- **Given** the relation exists **When** I create an Author ("Will Kitman"), add both "Will Kitman" and "Coach Beard" to the Homepage, and save **Then** the relations are saved.
- **Given** the saved Homepage with both Authors **When** I delete the "Will Kitman" author entry and open the Homepage history page **Then** the remaining "Coach Beard" relation is shown as a link **And** "Will Kitman" is no longer shown **And** a "missing relation" message is displayed.

## User Story: See renamed fields as unknown/new fields in history (single type)

**As a** content editor **I want** single-type history versions to flag renamed fields **so that** I can tell which historical fields no longer exist and which are new.

### Acceptance Criteria

- **Given** the history feature **When** I create a Homepage entry ("Welcome to AFC Richmond") **Then** an initial version is created.
- **Given** the Homepage entry exists **When** I rename the "title" field to "titleRename" in the Content-Type Builder and wait for restart **Then** the renamed field is shown in the edit view.
- **Given** the renamed field **When** I update the entry ("Welcome to AFC Richmond!") **Then** a second version is created.
- **Given** the second version exists **When** I select the previous version on the history page **Then** an "Unknown fields" section containing the old "title" field with its original value ("Welcome to AFC Richmond") is shown **And** the new "titleRename" field is shown as a "New field".
