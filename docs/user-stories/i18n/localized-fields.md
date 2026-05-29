# i18n Localized Fields and Locale Isolation

> Source: `tests/e2e/tests/i18n/localized-fields.spec.ts`

## User Story: Modifying a localized field only affects the current locale

**As a** content editor working with multiple locales **I want** changes to a localized field to affect only the current locale **so that** translations remain independent.

### Acceptance Criteria

- **Given** the product "Nike Mens 23/24 Away Stadium Jersey" with a Spanish (es) locale entry ("Camiseta Nike Masculina 23/24") created and saved **When** I modify the localized "name" field in English to "...Jersey - Modified" and save **Then** "Saved" is shown.
- **Given** the English "name" field has been modified and saved **When** I switch to Spanish **Then** the heading and name field still show "Camiseta Nike Masculina 23/24" (unchanged).
- **Given** the English "name" field has been modified and saved **When** I switch back to English **Then** the modified name is shown in both the heading and the name field.

## User Story: Publishing only affects the current locale

**As a** content editor working with multiple locales **I want** publishing one locale to leave other locales unchanged **so that** each locale's publication state is independent.

### Acceptance Criteria

- **Given** a Spanish (es) entry ("Camiseta Nike Masculina 23/24") is created and saved for the product **When** I publish the English locale **Then** "Published" is shown.
- **Given** the English locale has been published **When** I view the list view under English (en) **Then** the product row shows a "published" status.
- **Given** the English locale has been published **When** I switch the list view to Spanish (es) **Then** the product row shows a "draft" status.

## User Story: Modifying a non-localized field affects all locales

**As a** content editor working with multiple locales **I want** changes to a non-localized field to propagate to all locales **so that** shared values stay consistent across translations.

### Acceptance Criteria

- **Given** a Spanish (es) entry is created and saved for the product **When** I uncheck the non-localized "isAvailable" checkbox in English and save **Then** "Saved" is shown.
- **Given** the non-localized "isAvailable" checkbox has been unchecked and saved in English **When** I switch to Spanish **Then** the "isAvailable" checkbox is also unchecked.
- **Given** the non-localized "isAvailable" checkbox has been unchecked and saved in English **When** I switch back to English **Then** the "isAvailable" checkbox remains unchecked.
