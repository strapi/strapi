import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/media-library/future/grid-view.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Media Library Grid View (Unstable)', () => {
  describe('Switch between grid and table views', () => {
    // Given grid view is active
    // When I switch to table view
    // Then grid view becomes inactive
    test.todo('AC1.1 — I switch to table view');

    // Given table view is active
    // When I switch back to grid view
    // Then grid view becomes active again
    test.todo('AC1.2 — I switch back to grid view');
  });

  describe('Persist the view preference', () => {
    // Given I have switched to table view
    // When I reload the page
    // Then the view is still table view (grid view is not active)
    test.todo('AC2.1 — I reload the page');
  });

  describe('Display an uploaded file as a card in grid view', () => {
    // Given grid view and a file has been uploaded with the upload reaching success
    // When I view the grid
    // Then the "test-image" asset card is visible
    test.todo('AC3.1 — I view the grid');
  });
});
