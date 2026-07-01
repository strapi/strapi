# i18n Create and Edit Operations

> Source: `tests/e2e/tests/i18n/create-edit.spec.ts`

## User Story: Create a brand new document in a non-default locale

**As a** content editor working with multiple locales **I want** to create a brand new document directly in a non-default locale **so that** I can author locale-specific content that is independent of the default locale.

### Acceptance Criteria

**Scenario: Author a new Spanish document independent of the English one**

- **Given** the Products list view defaults to the English (en) locale and shows the existing "Nike Mens 23/24 Away Stadium Jersey" row
- **When** I switch the locale combobox to "Spanish (es)"
- **Then** "No content found" is shown
- **And When** I click "Create new entry"
- **Then** the create view opens with the Locales combobox set to "Spanish (es)" and the URL query param `plugins[i18n][locale]` equal to `es`
- **And When** I fill the name and click "Regenerate"
- **Then** a UID generate request is issued to `/content-manager/uid/generate?locale=es` with `contentTypeUID: api::product.product`, an empty id, and the entered name
- **And** the slug field is generated as `camiseta-de-fuera-23-24-de-nike-para-hombres`
- **And When** I publish the document
- **Then** a "Published" confirmation is shown
- **And When** I go back to the list view
- **Then** the locale stays "Spanish (es)" and the new Spanish row is visible
- **And When** I open the Spanish entry and switch to "English (en)"
- **Then** an "Untitled" heading is shown, confirming the document was created only in Spanish (a different document from the English one)

## User Story: Add a locale entry to an existing document

**As a** content editor working with multiple locales **I want** to add a new locale to an existing document **so that** the same document is available in another language.

### Acceptance Criteria

**Scenario: Add a Spanish locale to an existing English document**

- **Given** an existing English "Nike Mens 23/24 Away Stadium Jersey" product
- **When** I open it and switch the Locales combobox to "Spanish (es)"
- **Then** `plugins[i18n][locale]=es` is set and an "Untitled" heading is shown
- **And When** I fill the name and click "Regenerate"
- **Then** a UID generate request is issued to `/content-manager/uid/generate?locale=es` whose payload contains a non-empty document id (the existing document), the entered name, and slug
- **And** the slug is generated as `camiseta-de-fuera-23-24-de-nike-para-hombres`
- **And When** I publish
- **Then** a "Published" confirmation is shown and the Spanish row appears in the list view under the "Spanish (es)" locale
- **And When** I open the Spanish entry and switch back to "English (en)"
- **Then** "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming both locales belong to the same document
