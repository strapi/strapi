# i18n Locale Permissions

> Source: `tests/e2e/tests/i18n/permissions.spec.ts`

## User Story: Cannot create a document in a locale without permission

**As a** content editor working with multiple locales **I want** locale-level create permissions to be enforced **so that** I cannot create content in locales I am not permitted to use.

### Acceptance Criteria

- **Given** an administrator opens the Editor role and grants all Article permissions for English (en) and French (fr) but unchecks "Create" for French **When** the role is saved **Then** "Saved" is shown.
- **Given** the Editor role has been saved **When** I log in as the Editor **Then** the Content Manager defaults to English (en).
- **Given** I am logged in as the Editor in English (en) **When** I create a new English entry by filling the title and saving **Then** "Saved" is shown.
- **Given** I am logged in as the Editor **When** I open the Locales selector **Then** the "Create French (fr) locale" option is disabled.

## User Story: Delete a locale of a single type and collection type

**As a** content editor working with multiple locales **I want** to delete a specific locale entry **so that** I can remove a translation without affecting other locales.

### Acceptance Criteria

- **Given** a new Article entry ("trent crimm") is created and saved, with a Spanish (es) locale entry ("dani rojas") also created and saved **When** I use "More actions" > "Delete entry (Spanish (es))" and confirm **Then** "Deleted" is shown.
- **Given** the Homepage single type with "football is life" created and a Spanish entry "el fútbol también es muerte." added **When** I delete the Spanish locale entry **Then** "Deleted" is shown.
