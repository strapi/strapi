import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/localized-fields.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Localized Fields and Locale Isolation', () => {
  describe('Modifying a localized field only affects the current locale', () => {
    // Given the product "Nike Mens 23/24 Away Stadium Jersey" with a Spanish (es) locale entry ("Camiseta Nike Masculina 23/24") created and saved
    // When I modify the localized "name" field in English to "...Jersey - Modified" and save
    // Then "Saved" is shown
    test.todo('AC1.1 — I modify the localized "name" field in English to "...Jersey - Modifi…');

    // Given the English "name" field has been modified and saved
    // When I switch to Spanish
    // Then the heading and name field still show "Camiseta Nike Masculina 23/24" (unchanged)
    test.todo('AC1.2 — I switch to Spanish');

    // Given the English "name" field has been modified and saved
    // When I switch back to English
    // Then the modified name is shown in both the heading and the name field
    test.todo('AC1.3 — I switch back to English');
  });

  describe('Publishing only affects the current locale', () => {
    // Given a Spanish (es) entry ("Camiseta Nike Masculina 23/24") is created and saved for the product
    // When I publish the English locale
    // Then "Published" is shown
    test.todo('AC2.1 — I publish the English locale');

    // Given the English locale has been published
    // When I view the list view under English (en)
    // Then the product row shows a "published" status
    test.todo('AC2.2 — I view the list view under English (en)');

    // Given the English locale has been published
    // When I switch the list view to Spanish (es)
    // Then the product row shows a "draft" status
    test.todo('AC2.3 — I switch the list view to Spanish (es)');
  });

  describe('Modifying a non-localized field affects all locales', () => {
    // Given a Spanish (es) entry is created and saved for the product
    // When I uncheck the non-localized "isAvailable" checkbox in English and save
    // Then "Saved" is shown
    test.todo('AC3.1 — I uncheck the non-localized "isAvailable" checkbox in English and save');

    // Given the non-localized "isAvailable" checkbox has been unchecked and saved in English
    // When I switch to Spanish
    // Then the "isAvailable" checkbox is also unchecked
    test.todo('AC3.2 — I switch to Spanish');

    // Given the non-localized "isAvailable" checkbox has been unchecked and saved in English
    // When I switch back to English
    // Then the "isAvailable" checkbox remains unchecked
    test.todo('AC3.3 — I switch back to English');
  });
});
