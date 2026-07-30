import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-releases/releases-page.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Releases Page', () => {
  describe('Create an unscheduled release and view pending/done releases', () => {
    // Given the Releases page is open
    // When the user views the list
    // Then the existing pending release "Trent Crimm: The Independent" is shown
    test.todo('AC1.1 — the user views the list');

    // Given the Releases page is open
    // When the user clicks "New release"
    // Then a "New release" dialog opens
    test.todo('AC1.2 — the user clicks "New release"');

    // Given the "New release" dialog is open
    // When the user fills the Name ("The Diamond Dogs"), unchecks "Schedule release", and clicks "Continue"
    // Then the release is created
    test.todo('AC1.3 — the user fills the Name ("The Diamond Dogs"), unchecks "Schedule rele…');

    // Given the release has been created
    // When the user returns to the Releases page
    // Then the newly created release is shown in the list
    test.todo('AC1.4 — the user returns to the Releases page');
  });

  describe('Create a scheduled release', () => {
    // Given the Releases page is open
    // When the user clicks "New release"
    // Then a "New release" dialog opens
    test.todo('AC2.1 — the user clicks "New release"');

    // Given the "New release" dialog is open
    // When the user fills the Name ("The Diamond Dogs"), selects a date one day in the future, selects the time "08:00", and clicks "Continue"
    // Then the release is created
    test.todo('AC2.2 — the user fills the Name ("The Diamond Dogs"), selects a date one day…');

    // Given the scheduled release has been created
    // When the user returns to the Releases page
    // Then the newly created scheduled release is shown in the list
    test.todo('AC2.3 — the user returns to the Releases page');
  });

  describe('Bulk add entries to a release', () => {
    // Given the Releases page is open
    // When the user creates a new unscheduled release ("The Diamond Dogs")
    // Then its detail page can be opened
    test.todo('AC3.1 — the user creates a new unscheduled release ("The Diamond Dogs")');

    // Given the release detail page is open
    // When the user clicks "Open the Content Manager"
    // Then the user navigates to a collection-type list view (Article)
    test.todo('AC3.2 — the user clicks "Open the Content Manager"');

    // Given the Article list view is open
    // When the user selects all entries via "Select all entries" and triggers the "add to release" bulk action
    // Then a dialog opens
    test.todo('AC3.3 — the user selects all entries via "Select all entries" and triggers th…');

    // Given the "add to release" dialog is open
    // When the user selects the release "The Diamond Dogs" and the "unpublish" action then clicks "continue"
    // Then a "Successfully added to release." message is shown
    test.todo('AC3.4 — the user selects the release "The Diamond Dogs" and the "unpublish" a…');

    // Given entries have been added to the release
    // When the user views the content manager list view
    // Then the release column shows "1 release" for the affected entries
    test.todo('AC3.5 — the user views the content manager list view');
  });

  describe('Hide "add to release" for content types without draft & publish', () => {
    // Given the Article list view is open
    // When the user publishes all articles in bulk (select all -> "Publish" -> confirm in the "Confirmation" dialog)
    // Then a "Published document" notification is shown
    test.todo('AC4.1 — the user publishes all articles in bulk (select all -> "Publish" -> c…');

    // Given the Article content type exists
    // When draft & publish is disabled via the Content-Type Builder (Edit -> Advanced settings -> "Draft & publish" -> confirm "disable" -> "Finish" -> "Save")
    // Then the server restarts
    test.todo('AC4.2 — draft & publish is disabled via the Content-Type Builder (Edit -> Adv…');

    // Given draft & publish is disabled for the Article content type
    // When the user returns to the Article list view in the content manager and selects all entries
    // Then the "add to release" bulk action button is not visible
    test.todo('AC4.3 — the user returns to the Article list view in the content manager and…');
  });
});
