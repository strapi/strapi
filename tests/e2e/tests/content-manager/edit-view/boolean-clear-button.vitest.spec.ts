import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/edit-view/boolean-clear-button.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Boolean Field Clear Button', () => {
  describe('Clear button is hidden for required boolean fields', () => {
    // Then the `isAvailable` field is checked by default (its default value is `true`)
    test.todo('AC1.1 — the `isAvailable` field is checked by default (its default value is `…');

    // Then the "Clear" button is not revealed
    test.todo('AC1.2 — the "Clear" button is not revealed');

    // Then the "Clear" button is not revealed
    test.todo('AC1.3 — the "Clear" button is not revealed');
  });

  describe('Clear button appears only for optional boolean fields with a value', () => {
    // Then the "Clear" button becomes visible
    test.todo('AC2.1 — the "Clear" button becomes visible');

    // Then the field is set to null and the "Clear" button is no longer visible
    test.todo('AC2.2 — the field is set to null and the "Clear" button is no longer visible');
  });

  describe('Clearing a boolean sets it to null and persists after save', () => {
    // Then the "Clear" button is visible and the field is shown as checked
    test.todo('AC3.1 — the "Clear" button is visible and the field is shown as checked');

    // Then the field is left unchecked
    test.todo('AC3.2 — the field is left unchecked');

    // Then a "Saved" confirmation is shown
    test.todo('AC3.3 — a "Saved" confirmation is shown');

    // Then the `likesDogs` field remains unchecked and the "Clear" button is not visible
    test.todo('AC3.4 — the `likesDogs` field remains unchecked and the "Clear" button is not…');
  });
});
