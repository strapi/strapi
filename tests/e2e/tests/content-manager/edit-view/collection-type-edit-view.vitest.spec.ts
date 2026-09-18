import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/edit-view/collection-type-edit-view.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Collection Type Edit View', () => {
  describe('Be warned about draft relations when publishing (skipped)', () => {
    // Then a warning "This entry is related to 1" should be shown
    test.todo('AC1.1 — a warning "This entry is related to 1" should be shown');

    // Then the warning "This entry is related to 2" should be shown
    test.todo('AC1.2 — the warning "This entry is related to 2" should be shown');

    // Then the warning "This entry is related to 3" should still be displayed
    test.todo('AC1.3 — the warning "This entry is related to 3" should still be displayed');
  });

  describe('Create and publish a document at the same time, then modify and save it', () => {
    // Then the "Create an entry" heading and an enabled "More actions" button are shown
    test.todo('AC2.1 — the "Create an entry" heading and an enabled "More actions" button ar…');

    // Then a "Published Document" confirmation appears
    test.todo('AC2.2 — a "Published Document" confirmation appears');

    // Then "Save" and "Publish" are disabled
    test.todo('AC2.3 — "Save" and "Publish" are disabled');

    // Then "Save" and "Publish" remain disabled while "More document actions" is enabled
    test.todo('AC2.4 — "Save" and "Publish" remain disabled while "More document actions" is…');

    // Then the author shows as a button
    test.todo('AC2.5 — the author shows as a button');

    // Then a "Saved Document" confirmation appears followed by a "Modified" status
    test.todo('AC2.6 — a "Saved Document" confirmation appears followed by a "Modified" stat…');
  });

  describe('Create a document, then modify it', () => {
    // Then "Create an entry" and an enabled "More actions" button are shown, with Draft/Published tabs behaving as above (Draft selected/enabled, Published disabled)
    test.todo('AC3.1 — "Create an entry" and an enabled "More actions" button are shown, wit…');

    // Then a "Saved Document" confirmation appears and the Draft tab remains selected/enabled while Published stays disabled
    test.todo('AC3.2 — a "Saved Document" confirmation appears and the Draft tab remains sel…');

    // Then "Save" is re-enabled
    test.todo('AC3.3 — "Save" is re-enabled');

    // Then a "Saved Document" confirmation appears
    test.todo('AC3.4 — a "Saved Document" confirmation appears');

    // Then a "Saved Document" confirmation appears and the "Modified" status is not shown afterward
    test.todo('AC3.5 — a "Saved Document" confirmation appears and the "Modified" status is…');

    // Then the document publishes, producing a "Published Document" confirmation
    test.todo('AC3.6 — the document publishes, producing a "Published Document" confirmation');
  });

  describe('Discard changes', () => {
    // Then a "Published Document" confirmation is shown
    test.todo('AC4.1 — a "Published Document" confirmation is shown');

    // Then a "Saved Document" confirmation is shown
    test.todo('AC4.2 — a "Saved Document" confirmation is shown');

    // Then a "Changes discarded" confirmation is shown
    test.todo('AC4.3 — a "Changes discarded" confirmation is shown');
  });

  describe('Unpublish a document', () => {
    // Then the Draft tab is selected and enabled and the Published tab is not selected
    test.todo('AC5.1 — the Draft tab is selected and enabled and the Published tab is not se…');

    // Then "Published Document" is shown and the Published tab is enabled
    test.todo('AC5.2 — "Published Document" is shown and the Published tab is enabled');

    // Then an "Unpublished Document" confirmation is shown
    test.todo('AC5.3 — an "Unpublished Document" confirmation is shown');
  });

  describe('Delete a document', () => {
    // Then a "Deleted Document" confirmation is shown
    test.todo('AC6.1 — a "Deleted Document" confirmation is shown');
  });
});
