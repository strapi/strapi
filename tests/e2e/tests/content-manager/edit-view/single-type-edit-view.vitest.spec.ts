import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/edit-view/single-type-edit-view.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Single Type Edit View', () => {
  describe('Be warned about draft relations in dynamic zone components when publishing (skipped)', () => {
    // Then a warning "This entry is related to 1" should be shown
    test.todo('AC1.1 — a warning "This entry is related to 1" should be shown');

    // Then the warning "This entry is related to 1" should still be shown
    test.todo('AC1.2 — the warning "This entry is related to 1" should still be shown');
  });

  describe('Create and publish a single type at the same time, then modify and save it', () => {
    // Then its heading and an enabled "More actions" button are shown
    test.todo('AC2.1 — its heading and an enabled "More actions" button are shown');

    // Then a "Published Document" confirmation appears
    test.todo('AC2.2 — a "Published Document" confirmation appears');

    // Then Save and Publish are disabled
    test.todo('AC2.3 — Save and Publish are disabled');

    // Then Save and Publish remain disabled while "More document actions" is enabled
    test.todo('AC2.4 — Save and Publish remain disabled while "More document actions" is ena…');

    // Then a "Saved Document" confirmation and a "Modified" status are shown
    test.todo('AC2.5 — a "Saved Document" confirmation and a "Modified" status are shown');
  });

  describe('Create a single type, then modify it', () => {
    // Then its heading, an enabled "More actions" button, and the Draft/Published tabs (Draft selected/enabled, Published disabled) are shown
    test.todo('AC3.1 — its heading, an enabled "More actions" button, and the Draft/Publishe…');

    // Then a "Saved Document" confirmation appears; Draft stays selected/enabled and Published stays disabled
    test.todo('AC3.2 — a "Saved Document" confirmation appears; Draft stays selected/enabled…');

    // Then "Save" is re-enabled
    test.todo('AC3.3 — "Save" is re-enabled');

    // Then a "Saved Document" confirmation is shown
    test.todo('AC3.4 — a "Saved Document" confirmation is shown');
  });

  describe('Discard changes on a single type', () => {
    // Then a "Published Document" confirmation is shown
    test.todo('AC4.1 — a "Published Document" confirmation is shown');

    // Then a "Saved Document" confirmation is shown
    test.todo('AC4.2 — a "Saved Document" confirmation is shown');

    // Then a "Changes discarded" confirmation is shown and the heading reverts to "UK Shop"
    test.todo('AC4.3 — a "Changes discarded" confirmation is shown and the heading reverts t…');
  });

  describe('Unpublish a single type', () => {
    // Then the Draft tab is selected/enabled and the Published tab is not selected and disabled
    test.todo('AC5.1 — the Draft tab is selected/enabled and the Published tab is not select…');

    // Then "Published Document" is shown and the Published tab is enabled
    test.todo('AC5.2 — "Published Document" is shown and the Published tab is enabled');

    // Then an "Unpublished Document" confirmation is shown
    test.todo('AC5.3 — an "Unpublished Document" confirmation is shown');
  });

  describe('Add a component to a dynamic zone at a specific position', () => {
    // Then the count becomes 4
    test.todo('AC6.1 — the count becomes 4');

    // Then the count becomes 5
    test.todo('AC6.2 — the count becomes 5');

    // Then the count becomes 6
    test.todo('AC6.3 — the count becomes 6');
  });
});
