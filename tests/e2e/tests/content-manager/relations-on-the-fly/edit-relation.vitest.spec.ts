import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/relations-on-the-fly/edit-relation.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Relations on the Fly - Edit a Relation', () => {
  describe('Edit an existing relation in a modal, save and publish it', () => {
    // Then the "Edit a relation" modal is shown with `name` pre-filled as "Coach Beard"
    test.todo('AC1.1 — the "Edit a relation" modal is shown with `name` pre-filled as "Coach…');

    // Then the value is kept and a "Draft" status is shown
    test.todo('AC1.2 — the value is kept and a "Draft" status is shown');

    // Then the value is kept and a "Published" status is shown
    test.todo('AC1.3 — the value is kept and a "Published" status is shown');

    // Then "Mr. Coach Beard" is shown as a related author button on the parent Article
    test.todo('AC1.4 — "Mr. Coach Beard" is shown as a related author button on the parent A…');
  });

  describe('Edit an existing relation and open it in full page', () => {
    // Then the "Edit a relation" modal is shown
    test.todo('AC2.1 — the "Edit a relation" modal is shown');

    // Then I navigate to the author edit URL and the "Coach Beard" heading is shown
    test.todo('AC2.2 — I navigate to the author edit URL and the "Coach Beard" heading is sh…');
  });

  describe('Open a blocks editor modal on top of a relation modal', () => {
    // Then the "Edit a relation" modal is shown
    test.todo('AC3.1 — the "Edit a relation" modal is shown');

    // Then the blocks editor modal opens showing the content "Howdy"
    test.todo('AC3.2 — the blocks editor modal opens showing the content "Howdy"');
  });

  describe('Navigate nested relations and use the Back button', () => {
    // Then the "Back" button is disabled (top of the stack)
    test.todo('AC4.1 — the "Back" button is disabled (top of the stack)');

    // Then the "Back" button is enabled
    test.todo('AC4.2 — the "Back" button is enabled');

    // Then "Back" stays enabled
    test.todo('AC4.3 — "Back" stays enabled');

    // Then I return to "West Ham post match analysis" (Back still enabled)
    test.todo('AC4.4 — I return to "West Ham post match analysis" (Back still enabled)');

    // Then I return to "Coach Beard" (Back disabled again)
    test.todo('AC4.5 — I return to "Coach Beard" (Back disabled again)');
  });

  describe('Open a nested relation without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC5.1 — a confirmation modal is shown');

    // Then the "West Ham post match analysis" heading is shown
    test.todo('AC5.2 — the "West Ham post match analysis" heading is shown');
  });

  describe('Closing the relation modal without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC6.1 — a confirmation modal is shown');

    // Then I return to the "West Ham post match analysis" view
    test.todo('AC6.2 — I return to the "West Ham post match analysis" view');
  });

  describe('Opening full page without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC7.1 — a confirmation modal is shown');

    // Then I navigate to the author edit URL and the "Coach Beard" heading is shown
    test.todo('AC7.2 — I navigate to the author edit URL and the "Coach Beard" heading is sh…');
  });

  describe('Clicking Back without saving prompts a confirmation', () => {
    // Then a confirmation modal is shown
    test.todo('AC8.1 — a confirmation modal is shown');

    // Then I return to the "West Ham post match analysis" view
    test.todo('AC8.2 — I return to the "West Ham post match analysis" view');
  });

  describe('Open a relation inside a dynamic zone component', () => {
    // Then the "Edit a relation" modal is shown with the "Nike Mens 23/24 Away Stadium Jersey" heading
    test.todo('AC9.1 — the "Edit a relation" modal is shown with the "Nike Mens 23/24 Away S…');
  });

  describe('Add a relation, change its name and status, and see changes reflected in the edit view', () => {
    // Then it is shown as a button with a "Draft" status ("Led TassoDraft")
    test.todo('AC10.1 — it is shown as a button with a "Draft" status ("Led TassoDraft")');

    // Then the value is kept and a "Published" status is shown
    test.todo('AC10.2 — the value is kept and a "Published" status is shown');

    // Then "Mr. Led Tasso" is shown as a button and the text "Mr. Led TassoPublished" is shown in the edit view
    test.todo('AC10.3 — "Mr. Led Tasso" is shown as a button and the text "Mr. Led TassoPubli…');
  });
});
