# i18n Bulk Locale Modal

> Source: `tests/e2e/tests/i18n/bulk-locale-modal.spec.ts`

## User Story: Bulk locale modal lists all locales after creating a new localization

**As a** content editor working with multiple locales **I want** the bulk locale action modal to list every available locale (including newly created localizations) **so that** I can run a bulk action such as unpublishing across the correct set of locales.

### Acceptance Criteria

**Scenario: Bulk locale modal lists English after publishing a new localization**

- **Given** I am in the Content Manager on the Article collection type and the row "Why I prefer football over soccer" is visible
- **When** I open that document and click "Publish"
- **Then** a "Published" confirmation is shown
- **And When** I select "Spanish (es)" from the Locales combobox
- **Then** the view switches to that locale
- **And When** I open "More document actions" and choose "Unpublish multiple locales"
- **Then** the bulk locale modal opens
- **And** the bulk locale modal lists the English (en) locale as a row
- **And When** I select the "en" locale checkbox and click "Unpublish"
- **Then** a "Successfully unpublished" confirmation is shown
