import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/history.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Content History (EE)', () => {
  describe('Restore a previous history version', () => {
    // Given an entry ("Being from Kansas") that was then edited ("Being from Florida") and saved each time
    // When I open the history page
    // Then multiple history versions exist
    test.todo('AC1.1 — I open the history page');

    // Given the list of version cards
    // When I select the oldest version card
    // Then the title field shows the original value ("Being from Kansas")
    test.todo('AC1.2 — I select the oldest version card');

    // Given the oldest version is selected
    // When I click "Restore" and confirm "Restore" in the "Confirmation" alert dialog
    // Then the document is reverted
    test.todo('AC1.3 — I click "Restore" and confirm "Restore" in the "Confirmation" alert d…');
  });

  describe('Track collection-type versions across create / edit / publish / modify', () => {
    // Given the history page
    // When I create a French Article ("N'importe quoi")
    // Then a version with that title is visible on the history page
    test.todo('AC2.1 — I create a French Article ("N\'importe quoi")');

    // Given a French Article exists
    // When I create a separate English Article ("Being from Kansas is a pity")
    // Then exactly one version card is shown for the English locale
    test.todo('AC2.2 — I create a separate English Article ("Being from Kansas is a pity")');

    // Given the English Article
    // When I update the entry ("Being from Kansas City")
    // Then 2 version cards are produced
    test.todo('AC2.3 — I update the entry ("Being from Kansas City")');

    // Given the updated entry
    // When I publish it
    // Then 3 version cards are produced
    test.todo('AC2.4 — I publish it');

    // Given the published entry
    // When I modify it after publish ("Being from Kansas City, Missouri")
    // Then 4 version cards are produced
    test.todo('AC2.5 — I modify it after publish ("Being from Kansas City, Missouri")');
  });

  describe('See relations in history and detect missing relations (collection type)', () => {
    // Given I have created an Author ("Will Kitman")
    // When I create an Article ("Zava retires"), add both "Will Kitman" and "Coach Beard" as Authors, and save
    // Then the relations are saved
    test.todo('AC3.1 — I create an Article ("Zava retires"), add both "Will Kitman" and "Coa…');

    // Given the saved Article with both Authors
    // When I delete the "Will Kitman" author entry and open the Article's history page
    // Then the remaining "Coach Beard" relation is shown as a link
    test.todo('AC3.2 — I delete the "Will Kitman" author entry and open the Article\'s histor…');
  });

  describe('See renamed fields as unknown/new fields in history (collection type)', () => {
    // Given the history feature
    // When I create an Article ("Being from Kansas", slug "being-from-kansas")
    // Then an initial version is created
    test.todo('AC4.1 — I create an Article ("Being from Kansas", slug "being-from-kansas")');

    // Given the Article exists
    // When I rename the "title" field to "titleRename" in the Content-Type Builder and wait for restart
    // Then the renamed field is shown in the edit view
    test.todo('AC4.2 — I rename the "title" field to "titleRename" in the Content-Type Build…');

    // Given the renamed field
    // When I update the entry ("Being from Kansas City")
    // Then a second version is created
    test.todo('AC4.3 — I update the entry ("Being from Kansas City")');

    // Given the second version exists
    // When I select the previous version on the history page
    // Then an "Unknown fields" section containing the old "title" field with its original value ("Being from Kansas") is shown
    test.todo('AC4.4 — I select the previous version on the history page');
  });

  describe('Track single-type versions across create / edit / publish / modify', () => {
    // Given the history page
    // When I create a French Homepage ("Paris Saint-Germain")
    // Then a version is visible on the history page
    test.todo('AC5.1 — I create a French Homepage ("Paris Saint-Germain")');

    // Given a French Homepage exists
    // When I create the English Homepage ("AFC Richmond")
    // Then exactly one version card is shown
    test.todo('AC5.2 — I create the English Homepage ("AFC Richmond")');

    // Given the English Homepage
    // When I update it ("Welcome to AFC Richmond")
    // Then 2 version cards are produced
    test.todo('AC5.3 — I update it ("Welcome to AFC Richmond")');

    // Given the updated Homepage
    // When I publish it
    // Then 3 version cards are produced
    test.todo('AC5.4 — I publish it');

    // Given the published Homepage
    // When I modify it after publish ("Welcome to AFC Richmond!")
    // Then 4 version cards are produced
    test.todo('AC5.5 — I modify it after publish ("Welcome to AFC Richmond!")');
  });

  describe('See relations in history and detect missing relations (single type)', () => {
    // Given the Content-Type Builder
    // When I add an "authors" relation (Homepage has many Authors) and wait for restart
    // Then the relation is available
    test.todo('AC6.1 — I add an "authors" relation (Homepage has many Authors) and wait for…');

    // Given the relation exists
    // When I create an Author ("Will Kitman"), add both "Will Kitman" and "Coach Beard" to the Homepage, and save
    // Then the relations are saved
    test.todo('AC6.2 — I create an Author ("Will Kitman"), add both "Will Kitman" and "Coach…');

    // Given the saved Homepage with both Authors
    // When I delete the "Will Kitman" author entry and open the Homepage history page
    // Then the remaining "Coach Beard" relation is shown as a link
    test.todo('AC6.3 — I delete the "Will Kitman" author entry and open the Homepage history…');
  });

  describe('See renamed fields as unknown/new fields in history (single type)', () => {
    // Given the history feature
    // When I create a Homepage entry ("Welcome to AFC Richmond")
    // Then an initial version is created
    test.todo('AC7.1 — I create a Homepage entry ("Welcome to AFC Richmond")');

    // Given the Homepage entry exists
    // When I rename the "title" field to "titleRename" in the Content-Type Builder and wait for restart
    // Then the renamed field is shown in the edit view
    test.todo('AC7.2 — I rename the "title" field to "titleRename" in the Content-Type Build…');

    // Given the renamed field
    // When I update the entry ("Welcome to AFC Richmond!")
    // Then a second version is created
    test.todo('AC7.3 — I update the entry ("Welcome to AFC Richmond!")');

    // Given the second version exists
    // When I select the previous version on the history page
    // Then an "Unknown fields" section containing the old "title" field with its original value ("Welcome to AFC Richmond") is shown
    test.todo('AC7.4 — I select the previous version on the history page');
  });
});
