import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/relations-on-the-fly/create-relation.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Relations on the Fly - Create a Relation', () => {
  describe('Create a new relation in a modal and open it in full page', () => {
    // Then the "Create a relation" modal is shown
    test.todo('AC1.1 — the "Create a relation" modal is shown');

    // Then I navigate to the author create URL and the "Create an entry" heading is shown
    test.todo('AC1.2 — I navigate to the author create URL and the "Create an entry" heading…');
  });

  describe('Open a nested relation without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC2.1 — a confirmation modal is shown');

    // Then the nested "Create a relation" modal opens with an "Untitled" heading and a disabled "Back" button
    test.todo('AC2.2 — the nested "Create a relation" modal opens with an "Untitled" heading…');
  });

  describe('Add and edit a nested relation without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC3.1 — a confirmation modal is shown');

    // Then the nested "Edit a relation" modal opens with a "West Ham post match analysis" heading and a disabled "Back" button
    test.todo('AC3.2 — the nested "Edit a relation" modal opens with a "West Ham post match…');
  });

  describe('Closing the relation modal without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC4.1 — a confirmation modal is shown');

    // Then I return to the parent "West Ham post match analysis" view
    test.todo('AC4.2 — I return to the parent "West Ham post match analysis" view');
  });

  describe('Opening full page without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC5.1 — a confirmation modal is shown');

    // Then I navigate to the author create URL and the "Create an entry" heading is shown
    test.todo('AC5.2 — I navigate to the author create URL and the "Create an entry" heading…');
  });

  describe('Clicking Back without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC6.1 — a confirmation modal is shown');

    // Then I return to the "West Ham post match analysis" view
    test.todo('AC6.2 — I return to the "West Ham post match analysis" view');
  });
});
