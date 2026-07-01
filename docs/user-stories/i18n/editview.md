# i18n Edit View

> Source: `tests/e2e/tests/i18n/editview.spec.ts`

## User Story: Create a brand new document in a non-default locale

**As a** content editor working with multiple locales **I want** to create a brand new document directly in a non-default locale **so that** I can author locale-specific content independent of the default locale.

### Acceptance Criteria

**Scenario: Author a new Spanish document independent of the English one**

- **Given** the Products list view defaults to English (en) and shows the existing "Nike Mens 23/24 Away Stadium Jersey" row
- **When** I switch to "Spanish (es)"
- **Then** "No content found" is shown
- **And When** I click "Create new entry"
- **Then** the create view opens with the Locales combobox set to "Spanish (es)" and `plugins[i18n][locale]=es`
- **And When** I fill the name and click "Regenerate"
- **Then** a UID generate request is issued to `/content-manager/uid/generate?locale=es` with an empty id and the entered name
- **And** the slug becomes `camiseta-de-fuera-23-24-de-nike-para-hombres`
- **And When** I publish
- **Then** "Published" is shown and the new Spanish row appears in the list view under "Spanish (es)"
- **And When** I open it and switch to "English (en)"
- **Then** "Untitled" is shown, confirming a separate document was created

## User Story: Add a locale entry to an existing document

**As a** content editor working with multiple locales **I want** to add a new locale to an existing document **so that** the same document exists in another language.

### Acceptance Criteria

**Scenario: Add a Spanish locale to an existing English document**

- **Given** the existing English "Nike Mens 23/24 Away Stadium Jersey" product
- **When** I open it and switch the Locales combobox to "Spanish (es)"
- **Then** `plugins[i18n][locale]=es` is set and "Untitled" is shown
- **And When** I fill the name and click "Regenerate"
- **Then** a UID generate request is issued whose payload contains the existing document id (non-empty), the entered name, and slug
- **And** the slug becomes `camiseta-de-fuera-23-24-de-nike-para-hombres`
- **And When** I publish
- **Then** "Published" is shown and the Spanish row appears in the list view
- **And When** I switch the Spanish entry back to "English (en)"
- **Then** "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming the same document

## User Story: Cannot create a document in a locale without permission

**As a** content editor working with multiple locales **I want** locale-level create permissions enforced **so that** I cannot create content in locales I am not allowed to.

### Acceptance Criteria

**Scenario: Locale-level create permission is enforced**

- **Given** an administrator grants the Editor role all permissions on Article for English (en) and French (fr) but unchecks "Create" for French
- **When** the administrator saves the role
- **Then** "Saved" is shown
- **And Given** the user logs in as the Editor
- **Then** the Content Manager defaults to English (en)
- **When** the Editor creates a new English entry, filling the title and saving
- **Then** "Saved" is shown
- **And** in the Locales selector the "Create French (fr) locale" option is disabled

## User Story: Delete a locale of a single type and collection type

**As a** content editor working with multiple locales **I want** to delete a specific locale of a document **so that** I can remove a translation without affecting other locales.

### Acceptance Criteria

- A new Article entry can be created ("trent crimm") and saved.
- A Spanish (es) locale entry ("dani rojas") can be created for it and saved.
- Using "More actions" > "Delete entry (Spanish (es))" and confirming shows "Deleted".
- The same flow works for the Homepage single type: create English entry ("football is life"), add a Spanish entry ("el fútbol también es muerte."), then delete the Spanish locale entry showing "Deleted".

## User Story: Publish multiple locales of a document

**As a** content editor working with multiple locales **I want** to publish several locales of a document at once **so that** I can release translations together.

### Acceptance Criteria

- Starting from the English "Why I prefer football over soccer" article, switching to Spanish (es) shows "Untitled".
- A Spanish draft can be created (title "Por qué prefiero el fútbol al fútbol") and saved.
- Opening "More document actions" > "Publish multiple locales" opens the bulk publish modal.
- Selecting all entries shows "2 entries ready to publish".
- Clicking "Publish" publishes them and 2 gridcells show "Already Published".
- After publishing, the modal's "Publish" button is disabled.

## User Story: Unpublish multiple locales of a document

**As a** content editor working with multiple locales **I want** to unpublish several locales at once **so that** I can withdraw translations together.

### Acceptance Criteria

- The English "Why I prefer football over soccer" article is published ("Published" confirmation).
- A Spanish draft ("Por qué prefiero el fútbol al fútbol") is created, saved, and published.
- Opening "More document actions" > "Unpublish multiple locales" opens the bulk unpublish modal.
- Selecting all entries shows 2 gridcells with "Ready to unpublish".
- Clicking "Unpublish" leaves 2 gridcells showing "Draft".
- After unpublishing, the modal's "Unpublish" button is disabled.

## User Story: Non-translatable fields are pre-filled when creating a new locale

**As a** content editor working with multiple locales **I want** non-localized fields to be pre-filled from an existing locale when I create a new one **so that** shared values do not have to be re-entered.

### Acceptance Criteria

- A non-localized text field ("nonTranslatableField", localization disabled) can be added to the Products content type via the Content-Type Builder and saved (with a server restart).
- Creating an English entry with a translatable name and a non-translatable value, then saving, shows "Saved Document".
- Switching to French (fr) pre-fills "nonTranslatableField" with the English value while the translatable "name" field is empty.
- The French entry can be saved ("Saved Document").
- The added field can be removed from the content type afterwards.

## User Story: Non-localized fields stay pre-filled when revisiting an unsaved locale draft

**As a** content editor working with multiple locales **I want** non-localized values to remain pre-filled when I switch back to an unsaved locale draft **so that** shared data is never lost while editing.

### Acceptance Criteria

- After adding a non-localized field and creating an English entry ("Revisit product" with non-localized value "Shared across locales"), switching to the unsaved French draft inherits the non-localized value while "name" is empty.
- Switching back to English (confirming the unsaved-changes dialog) restores "name" to "Revisit product".
- Switching to French again still shows "nonTranslatableField" = "Shared across locales" and an empty "name" (regression: previously the field would be empty).
- The non-localized field can be removed from the content type as cleanup.

## User Story: Enable AI translation (unstable feature)

**As a** content editor working with multiple locales **I want** to enable AI translation from settings **so that** the AI translation status reflects the enabled state in the edit view.

### Acceptance Criteria

- This behavior is only tested when the `STRAPI_FEATURES_UNSTABLE_AI_LOCALIZATIONS` feature flag is enabled.
- On an Article edit view the "AI Translation Status" indicator is visible and, on hover, shows a tooltip "AI translation disabled".
- Following the "Enable it in settings" link navigates to the internationalization settings page.
- The settings checkbox starts unchecked; checking it shows "Changes saved" and the checkbox becomes checked.
- Returning to the Article, the "AI Translation Status" hover tooltip now reads "AI translation enabled".
