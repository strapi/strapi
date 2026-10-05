import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/create-edit.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Create and Edit Operations', () => {
  describe('Create a brand new document in a non-default locale', () => {
    // Then "No content found" is shown
    test.todo('AC1.1 — "No content found" is shown');

    // Then the create view opens with the Locales combobox set to "Spanish (es)" and the URL query param `plugins[i18n][locale]` equal to `es`
    test.todo('AC1.2 — the create view opens with the Locales combobox set to "Spanish (es)"…');

    // Then a UID generate request is issued to `/content-manager/uid/generate?locale=es` with `contentTypeUID: api::product.product`, an empty id, and the entered name
    test.todo('AC1.3 — a UID generate request is issued to `/content-manager/uid/generate?lo…');

    // Then a "Published" confirmation is shown
    test.todo('AC1.4 — a "Published" confirmation is shown');

    // Then the locale stays "Spanish (es)" and the new Spanish row is visible
    test.todo('AC1.5 — the locale stays "Spanish (es)" and the new Spanish row is visible');

    // Then an "Untitled" heading is shown, confirming the document was created only in Spanish (a different document from the English one)
    test.todo('AC1.6 — an "Untitled" heading is shown, confirming the document was created o…');
  });

  describe('Add a locale entry to an existing document', () => {
    // Then `plugins[i18n][locale]=es` is set and an "Untitled" heading is shown
    test.todo('AC2.1 — `plugins[i18n][locale]=es` is set and an "Untitled" heading is shown');

    // Then a UID generate request is issued to `/content-manager/uid/generate?locale=es` whose payload contains a non-empty document id (the existing document), the entered name, and slug
    test.todo('AC2.2 — a UID generate request is issued to `/content-manager/uid/generate?lo…');

    // Then a "Published" confirmation is shown and the Spanish row appears in the list view under the "Spanish (es)" locale
    test.todo('AC2.3 — a "Published" confirmation is shown and the Spanish row appears in th…');

    // Then "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming both locales belong to the same document
    test.todo('AC2.4 — "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming both…');
  });
});
