# i18n Fill From Another Locale

> Source: `tests/e2e/tests/i18n/fill-from-locale.spec.ts`

## User Story: Retrieve localized relations with "Fill in from another locale"

**As a** content editor working with multiple locales **I want** to fill a new locale's form from another locale **so that** I can reuse existing content and have relations carried over correctly based on what exists in the target locale.

### Acceptance Criteria

- **Given** the Shop single type (UK Shop) with a product relation ("Nike Mens 23/24 Away Stadium") added to the product carousel and the document published ("Published document") **When** I switch to a new Spanish (es) locale **Then** an empty form is shown (`plugins[i18n][locale]=es`, title input empty).
- **Given** the empty Spanish (es) Shop form **When** I use "Fill in from another locale" with "English (en)" **Then** the title is filled to "UK Shop".
- **Given** the related product has no Spanish locale (relation absent in target locale) **When** I fill the Spanish Shop form from English **Then** the filled Spanish form does NOT include the "Nike Mens 23/24 Away Stadium" relation.
- **Given** a Spanish locale has been created for the product (via fill-from-locale and publish) so the relation is present in the target locale **When** I fill the Spanish Shop from English **Then** the title shows "UK Shop" **And** the "Nike Mens 23/24 Away Stadium" relation is now visible.
- **Given** an Article ("West Ham post match analysis") with a non-localized relation **When** I fill a Spanish locale from English **Then** the non-localized relation is carried over **And** the "Coach Beard" relation is visible.
