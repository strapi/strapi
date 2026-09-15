# i18n List View

> Source: `tests/e2e/tests/i18n/listview.spec.ts`

## User Story: Locale column and switcher appear only for i18n-enabled content types

**As a** content editor working with multiple locales **I want** the locale column and locale switcher to appear only when a content type has i18n enabled **so that** the list view reflects whether a content type is localized.

### Acceptance Criteria

- **Given** the Products content type has i18n enabled **When** I open its list view **Then** a locale column ("Available in") is shown **And** the default locale cell and button read "English (en) (default)" **And** a "Select a locale" combobox is visible.
- **Given** the Products list view **When** I open the locale combobox **Then** it lists English (en), French (fr), German (de), and Spanish (es).
- **Given** the Products list view **When** I select "French (fr)" **Then** `plugins[i18n][locale]=fr` is set **And** "No content found" is shown.
- **Given** the Author content type has i18n disabled **When** I open its list view **Then** the "Select a locale" combobox and the "Available in" column are not present.

## User Story: Persist the selected locale when navigating between content types

**As a** content editor working with multiple locales **I want** my selected locale to persist as I navigate between content types **so that** I keep working in the same locale without re-selecting it.

### Acceptance Criteria

- **Given** the Products list view **When** I switch to Spanish (es) and create a new entry **Then** `plugins[i18n][locale]=es` is set **And** a Spanish product can be created and published.
- **Given** I am working in Spanish (es) **When** I return to the Products list view **Then** `plugins[i18n][locale]=es` is kept.
- **Given** I am working in Spanish (es) **When** I navigate to another localized content type (Article) **Then** `plugins[i18n][locale]=es` is kept.
- **Given** I am working in Spanish (es) **When** I navigate to a non-localized content type (Author) **Then** the `plugins[i18n][locale]` search param is still present.
- **Given** I am working in Spanish (es) **When** I navigate back to a localized content type (Products) **Then** `plugins[i18n][locale]=es` is still set.
