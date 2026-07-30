import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/fill-from-locale.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Fill From Another Locale', () => {
  describe('Retrieve localized relations with "Fill in from another locale"', () => {
    // Given the Shop single type (UK Shop) with a product relation ("Nike Mens 23/24 Away Stadium") added to the product carousel and the document published ("Published document")
    // When I switch to a new Spanish (es) locale
    // Then an empty form is shown (`plugins[i18n][locale]=es`, title input empty)
    test.todo('AC1.1 — I switch to a new Spanish (es) locale');

    // Given the empty Spanish (es) Shop form
    // When I use "Fill in from another locale" with "English (en)"
    // Then the title is filled to "UK Shop"
    test.todo('AC1.2 — I use "Fill in from another locale" with "English (en)"');

    // Given the related product has no Spanish locale (relation absent in target locale)
    // When I fill the Spanish Shop form from English
    // Then the filled Spanish form does NOT include the "Nike Mens 23/24 Away Stadium" relation
    test.todo('AC1.3 — I fill the Spanish Shop form from English');

    // Given a Spanish locale has been created for the product (via fill-from-locale and publish) so the relation is present in the target locale
    // When I fill the Spanish Shop from English
    // Then the title shows "UK Shop"
    test.todo('AC1.4 — I fill the Spanish Shop from English');

    // Given an Article ("West Ham post match analysis") with a non-localized relation
    // When I fill a Spanish locale from English
    // Then the non-localized relation is carried over
    test.todo('AC1.5 — I fill a Spanish locale from English');
  });
});
