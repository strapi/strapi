import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/i18n/settings.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('i18n Settings', () => {
  describe('Create a locale and then create an entry in that locale', () => {
    // Given the Internationalization settings page lists the installed locales (English, French, German, Spanish) as a 5-row table including the header
    // When I click "Add new locale"
    // Then the "Add new locale" dialog opens with a Configuration heading
    test.todo('AC1.1 — I click "Add new locale"');

    // Given the "Add new locale" dialog is open
    // When I select Italian (it) and save
    // Then "Locale successfully added" is shown
    test.todo('AC1.2 — I select Italian (it) and save');

    // Given Italian (it) has been added
    // When I open the Shop single type Locales combobox
    // Then it lists all 5 locales including Italian (it)
    test.todo('AC1.3 — I open the Shop single type Locales combobox');

    // Given the Shop single type
    // When I select the new Italian locale
    // Then an empty entry is presented whose "Publish" and "Save" buttons are disabled
    test.todo('AC1.4 — I select the new Italian locale');

    // Given the empty Italian entry on the Shop single type in EE
    // When I open "More document actions"
    // Then it is enabled with "Add to release" enabled and "Unpublish"/"Discard changes" disabled
    test.todo('AC1.5 — I open "More document actions"');

    // Given the empty Italian entry on the Shop single type in CE
    // When I view "More document actions"
    // Then it is disabled
    test.todo('AC1.6 — I view "More document actions"');

    // Given the empty Italian entry on the Shop single type
    // When I open the "More actions" menu
    // Then "Edit the model" and "Configure the view" are enabled
    test.todo('AC1.7 — I open the "More actions" menu');

    // Given the Italian entry is created by filling required fields and adding the required dynamic-zone components
    // When I publish
    // Then publishing initially fails with a "missing components" validation prompt
    test.todo('AC1.8 — I publish');

    // Given the publish failed for missing components
    // When I add the missing "Product carousel" and "Hero image" components (content (2) shown) and publish
    // Then publishing succeeds with "Published"
    test.todo('AC1.9 — I add the missing "Product carousel" and "Hero image" components (con…');
  });

  describe('Delete a locale and its content', () => {
    // Given the Article list view defaults to English (en) and shows 3 rows (including header) with the locale dropdown listing all four locales
    // When I delete the French (fr) locale from Internationalization settings and confirm
    // Then "Locale successfully deleted" is shown
    test.todo('AC2.1 — I delete the French (fr) locale from Internationalization settings an…');

    // Given the French (fr) locale has been deleted
    // When I return to the Article list view
    // Then English (en) still has its 3 rows
    test.todo('AC2.2 — I return to the Article list view');
  });

  describe('Update a locale and reflect the change everywhere', () => {
    // Given the Products list view defaults to English (en) and the locale dropdown lists all four locales
    // When I rename the default "English (en)" locale display name to "UK English" in settings and save
    // Then "Locale successfully edited" is shown
    test.todo('AC3.1 — I rename the default "English (en)" locale display name to "UK Englis…');

    // Given the default locale has been renamed to "UK English"
    // When I return to the Products list view
    // Then the locale combobox now reads "UK English"
    test.todo('AC3.2 — I return to the Products list view');
  });
});
