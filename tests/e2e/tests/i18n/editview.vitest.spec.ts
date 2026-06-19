import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/editview.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Edit View', () => {
  describe('Create a brand new document in a non-default locale', () => {
    // Then "No content found" is shown
    test.todo('AC1.1 — "No content found" is shown');

    // Then the create view opens with the Locales combobox set to "Spanish (es)" and `plugins[i18n][locale]=es`
    test.todo('AC1.2 — the create view opens with the Locales combobox set to "Spanish (es)"…');

    // Then a UID generate request is issued to `/content-manager/uid/generate?locale=es` with an empty id and the entered name
    test.todo('AC1.3 — a UID generate request is issued to `/content-manager/uid/generate?lo…');

    // Then "Published" is shown and the new Spanish row appears in the list view under "Spanish (es)"
    test.todo('AC1.4 — "Published" is shown and the new Spanish row appears in the list view…');

    // Then "Untitled" is shown, confirming a separate document was created
    test.todo('AC1.5 — "Untitled" is shown, confirming a separate document was created');
  });

  describe('Add a locale entry to an existing document', () => {
    // Then `plugins[i18n][locale]=es` is set and "Untitled" is shown
    test.todo('AC2.1 — `plugins[i18n][locale]=es` is set and "Untitled" is shown');

    // Then a UID generate request is issued whose payload contains the existing document id (non-empty), the entered name, and slug
    test.todo('AC2.2 — a UID generate request is issued whose payload contains the existing…');

    // Then "Published" is shown and the Spanish row appears in the list view
    test.todo('AC2.3 — "Published" is shown and the Spanish row appears in the list view');

    // Then "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming the same document
    test.todo('AC2.4 — "Nike Mens 23/24 Away Stadium Jersey" is still shown, confirming the…');
  });

  describe('Cannot create a document in a locale without permission', () => {
    // Then "Saved" is shown
    test.todo('AC3.1 — "Saved" is shown');

    // Then the Content Manager defaults to English (en)
    test.todo('AC3.2 — the Content Manager defaults to English (en)');

    // Then "Saved" is shown
    test.todo('AC3.3 — "Saved" is shown');
  });

  describe('Delete a locale of a single type and collection type', () => {});

  describe('Publish multiple locales of a document', () => {});

  describe('Unpublish multiple locales of a document', () => {});

  describe('Non-translatable fields are pre-filled when creating a new locale', () => {});

  describe('Non-localized fields stay pre-filled when revisiting an unsaved locale draft', () => {});

  describe('Enable AI translation (unstable feature)', () => {});
});
