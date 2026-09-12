import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/cloning.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Cloning', () => {
  describe('Auto-clone a document with no blocking fields', () => {
    // Given the Author list view
    // When I view the entries
    // Then I see a single "Coach Beard" row
    test.todo('AC1.1 — I view the entries');

    // Given a "Coach Beard" row
    // When I open its "Row actions" menu and click "Duplicate"
    // Then the document is cloned
    test.todo('AC1.2 — I open its "Row actions" menu and click "Duplicate"');

    // Given the document has been cloned
    // When I land on the edit view of the new (already saved) cloned document
    // Then the heading shows "Coach Beard"
    test.todo('AC1.3 — I land on the edit view of the new (already saved) cloned document');

    // Given the cloned document
    // When I return to the Author list view
    // Then two "Coach Beard" rows are shown
    test.todo('AC1.4 — I return to the Author list view');
  });

  describe('Auto-clone a document in a non-default locale', () => {
    // Given the Team list view
    // When I switch the locale selector to "Spanish (es)"
    // Then I am working in the Spanish locale
    test.todo('AC2.1 — I switch the locale selector to "Spanish (es)"');

    // Given the Spanish locale
    // When I create a new Team entry ("FC Barcelona", founded "1899") and publish it
    // Then a "Published" confirmation appears
    test.todo('AC2.2 — I create a new Team entry ("FC Barcelona", founded "1899") and publis…');

    // Given the published Team entry
    // When I return to the list view
    // Then at least one "FC Barcelona" row is visible
    test.todo('AC2.3 — I return to the list view');

    // Given an "FC Barcelona" row
    // When I open its "Row actions" menu and click "Duplicate"
    // Then the entry is cloned
    test.todo('AC2.4 — I open its "Row actions" menu and click "Duplicate"');

    // Given the entry has been cloned
    // When I land on the edit view of the new cloned document
    // Then the heading shows "FC Barcelona"
    test.todo('AC2.5 — I land on the edit view of the new cloned document');
  });

  describe('Clone an entry that has blocking fields (relations / unique slug)', () => {
    // Given the Article list view
    // When I view the entries
    // Then I see a single "West ham post match analysis" row
    test.todo('AC3.1 — I view the entries');

    // Given an entry with a unique UID slug
    // When I open its "Row actions" menu and click "Duplicate"
    // Then a message "This entry can't be duplicated directly." is shown
    test.todo('AC3.2 — I open its "Row actions" menu and click "Duplicate"');

    // Given the entry can't be duplicated directly
    // When the "Duplicate" dialog is shown
    // Then it has a heading "Duplicate"
    test.todo('AC3.3 — the "Duplicate" dialog is shown');

    // Given the "Duplicate" dialog
    // When I click "Create"
    // Then I am taken to the clone edit route where the "Save" button is enabled
    test.todo('AC3.4 — I click "Create"');

    // Given the clone edit route
    // When I clear and set a new unique slug ("hammers-post-match-analysis") and click "Save"
    // Then a "Cloned document" confirmation appears
    test.todo('AC3.5 — I clear and set a new unique slug ("hammers-post-match-analysis") and…');

    // Given the entry has been cloned
    // When I return to the Article list view
    // Then two "West ham post match analysis" rows are shown
    test.todo('AC3.6 — I return to the Article list view');
  });
});
