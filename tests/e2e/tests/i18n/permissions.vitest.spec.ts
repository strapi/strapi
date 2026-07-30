import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/permissions.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Locale Permissions', () => {
  describe('Cannot create a document in a locale without permission', () => {
    // Given an administrator opens the Editor role and grants all Article permissions for English (en) and French (fr) but unchecks "Create" for French
    // When the role is saved
    // Then "Saved" is shown
    test.todo('AC1.1 — the role is saved');

    // Given the Editor role has been saved
    // When I log in as the Editor
    // Then the Content Manager defaults to English (en)
    test.todo('AC1.2 — I log in as the Editor');

    // Given I am logged in as the Editor in English (en)
    // When I create a new English entry by filling the title and saving
    // Then "Saved" is shown
    test.todo('AC1.3 — I create a new English entry by filling the title and saving');

    // Given I am logged in as the Editor
    // When I open the Locales selector
    // Then the "Create French (fr) locale" option is disabled
    test.todo('AC1.4 — I open the Locales selector');
  });

  describe('Delete a locale of a single type and collection type', () => {
    // Given a new Article entry ("trent crimm") is created and saved, with a Spanish (es) locale entry ("dani rojas") also created and saved
    // When I use "More actions" > "Delete entry (Spanish (es))" and confirm
    // Then "Deleted" is shown
    test.todo('AC2.1 — I use "More actions" > "Delete entry (Spanish (es))" and confirm');

    // Given the Homepage single type with "football is life" created and a Spanish entry "el fútbol también es muerte." added
    // When I delete the Spanish locale entry
    // Then "Deleted" is shown
    test.todo('AC2.2 — I delete the Spanish locale entry');
  });
});
