import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/conditional-fields/enum-conditional-text-field-visibility.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Enum-Controlled Visibility of Text Fields', () => {
  describe('Enum value controls text field visibility and clears the value when hidden', () => {
    // Then the `favoriteToy` field is visible
    test.todo('AC1.1 — the `favoriteToy` field is visible');

    // Then the `favoriteToy` field is hidden
    test.todo('AC1.2 — the `favoriteToy` field is hidden');

    // Then a "Saved Document" confirmation is shown
    test.todo('AC1.3 — a "Saved Document" confirmation is shown');

    // Then `favoriteToy` is visible again but empty (its value was cleared when hidden)
    test.todo('AC1.4 — `favoriteToy` is visible again but empty (its value was cleared when…');

    // Then the value persists and the field shows "kong"
    test.todo('AC1.5 — the value persists and the field shows "kong"');
  });

  describe('Publish an entry that has hidden required conditional fields', () => {
    // Then the required `linkExternal` field is visible and `linkInternal` is hidden
    test.todo('AC2.1 — the required `linkExternal` field is visible and `linkInternal` is hi…');

    // Then publishing fails with a "There are validation errors" alert and a "This value is required" message
    test.todo('AC2.2 — publishing fails with a "There are validation errors" alert and a "Th…');

    // Then the required `linkInternal` field is shown and `linkExternal` is hidden
    test.todo('AC2.3 — the required `linkInternal` field is shown and `linkExternal` is hidd…');

    // Then the entry publishes successfully with a "Published Document" confirmation (the now-hidden required `linkExternal` does not block publishing)
    test.todo('AC2.4 — the entry publishes successfully with a "Published Document" confirma…');
  });
});
