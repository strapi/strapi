import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/admin/home-customization.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Homepage Widget Customization', () => {
  describe('See an empty state when no widgets are available to add', () => {
    // Given I have logged in and the homepage greets me with "Hello test"
    // When I click "Add Widget"
    // Then a widget selection modal (a dialog) opens
    test.todo('AC1.1 — I click "Add Widget"');
  });

  describe('Remove a widget and add it back via the modal', () => {
    // Given I have logged in, the homepage greets me with "Hello test", and the Profile widget is visible
    // When I hover over the Profile widget
    // Then its delete control is revealed
    test.todo('AC2.1 — I hover over the Profile widget');

    // Given the Profile widget's delete control is revealed
    // When I click the delete control
    // Then the Profile widget is removed from the homepage
    test.todo('AC2.2 — I click the delete control');

    // Given the Profile widget has been removed
    // When I click "Add Widget"
    // Then the widget selection modal opens
    test.todo('AC2.3 — I click "Add Widget"');

    // Given the removed Profile widget is offered in the modal
    // When I click the Profile widget preview in the modal
    // Then the modal closes
    test.todo('AC2.4 — I click the Profile widget preview in the modal');
  });
});
