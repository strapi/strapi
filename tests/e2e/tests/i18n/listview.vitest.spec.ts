import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/listview.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n List View', () => {
  describe('Locale column and switcher appear only for i18n-enabled content types', () => {
    // Given the Products content type has i18n enabled
    // When I open its list view
    // Then a locale column ("Available in") is shown
    test.todo('AC1.1 — I open its list view');

    // Given the Products list view
    // When I open the locale combobox
    // Then it lists English (en), French (fr), German (de), and Spanish (es)
    test.todo('AC1.2 — I open the locale combobox');

    // Given the Products list view
    // When I select "French (fr)"
    // Then `plugins[i18n][locale]=fr` is set
    test.todo('AC1.3 — I select "French (fr)"');

    // Given the Author content type has i18n disabled
    // When I open its list view
    // Then the "Select a locale" combobox and the "Available in" column are not present
    test.todo('AC1.4 — I open its list view');
  });

  describe('Persist the selected locale when navigating between content types', () => {
    // Given the Products list view
    // When I switch to Spanish (es) and create a new entry
    // Then `plugins[i18n][locale]=es` is set
    test.todo('AC2.1 — I switch to Spanish (es) and create a new entry');

    // Given I am working in Spanish (es)
    // When I return to the Products list view
    // Then `plugins[i18n][locale]=es` is kept
    test.todo('AC2.2 — I return to the Products list view');

    // Given I am working in Spanish (es)
    // When I navigate to another localized content type (Article)
    // Then `plugins[i18n][locale]=es` is kept
    test.todo('AC2.3 — I navigate to another localized content type (Article)');

    // Given I am working in Spanish (es)
    // When I navigate to a non-localized content type (Author)
    // Then the `plugins[i18n][locale]` search param is still present
    test.todo('AC2.4 — I navigate to a non-localized content type (Author)');

    // Given I am working in Spanish (es)
    // When I navigate back to a localized content type (Products)
    // Then `plugins[i18n][locale]=es` is still set
    test.todo('AC2.5 — I navigate back to a localized content type (Products)');
  });
});
