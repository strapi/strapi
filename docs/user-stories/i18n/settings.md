# i18n Settings

> Source: `tests/e2e/tests/i18n/settings.spec.ts`

## User Story: Create a locale and then create an entry in that locale

**As a** content editor working with multiple locales **I want** to add a new locale in settings and then author content in it **so that** I can expand my application to a new language end to end.

### Acceptance Criteria

- **Given** the Internationalization settings page lists the installed locales (English, French, German, Spanish) as a 5-row table including the header **When** I click "Add new locale" **Then** the "Add new locale" dialog opens with a Configuration heading.
- **Given** the "Add new locale" dialog is open **When** I select Italian (it) and save **Then** "Locale successfully added" is shown.
- **Given** Italian (it) has been added **When** I open the Shop single type Locales combobox **Then** it lists all 5 locales including Italian (it).
- **Given** the Shop single type **When** I select the new Italian locale **Then** an empty entry is presented whose "Publish" and "Save" buttons are disabled.
- **Given** the empty Italian entry on the Shop single type in EE **When** I open "More document actions" **Then** it is enabled with "Add to release" enabled and "Unpublish"/"Discard changes" disabled.
- **Given** the empty Italian entry on the Shop single type in CE **When** I view "More document actions" **Then** it is disabled.
- **Given** the empty Italian entry on the Shop single type **When** I open the "More actions" menu **Then** "Edit the model" and "Configure the view" are enabled **And** "Delete entry (Italian (it))" is disabled **And** the generic "Delete entry" is enabled.
- **Given** the Italian entry is created by filling required fields and adding the required dynamic-zone components **When** I publish **Then** publishing initially fails with a "missing components" validation prompt.
- **Given** the publish failed for missing components **When** I add the missing "Product carousel" and "Hero image" components (content (2) shown) and publish **Then** publishing succeeds with "Published".

## User Story: Delete a locale and its content

**As a** content editor working with multiple locales **I want** deleting a locale to also remove its content **so that** removing a language cleans up associated entries.

### Acceptance Criteria

- **Given** the Article list view defaults to English (en) and shows 3 rows (including header) with the locale dropdown listing all four locales **When** I delete the French (fr) locale from Internationalization settings and confirm **Then** "Locale successfully deleted" is shown.
- **Given** the French (fr) locale has been deleted **When** I return to the Article list view **Then** English (en) still has its 3 rows **And** the locale dropdown no longer lists French (fr) while still listing the other locales.

## User Story: Update a locale and reflect the change everywhere

**As a** content editor working with multiple locales **I want** editing a locale's display name to be reflected throughout the application **so that** the renamed locale shows consistently.

### Acceptance Criteria

- **Given** the Products list view defaults to English (en) and the locale dropdown lists all four locales **When** I rename the default "English (en)" locale display name to "UK English" in settings and save **Then** "Locale successfully edited" is shown.
- **Given** the default locale has been renamed to "UK English" **When** I return to the Products list view **Then** the locale combobox now reads "UK English" **And** the dropdown lists "UK English" instead of "English (en)" alongside the other locales.
