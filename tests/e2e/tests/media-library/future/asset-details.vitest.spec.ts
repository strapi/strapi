import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/media-library/future/asset-details.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Media Library Asset Details Drawer (Unstable)', () => {
  describe('Open the details drawer and view file info', () => {
    // Given the table view
    // When I click the asset "ted_lasso_profile.jpeg"
    // Then the asset details drawer opens
    test.todo('AC1.1 — I click the asset "ted_lasso_profile.jpeg"');

    // Given the asset details drawer is open
    // When I close it
    // Then it is no longer visible
    test.todo('AC1.2 — I close it');

    // Given the grid view
    // When I click the "coach_beard_profile.jpg" card
    // Then the drawer opens showing "File info" and the file name "coach_beard_profile.jpg"
    test.todo('AC1.3 — I click the "coach_beard_profile.jpg" card');
  });

  describe('Edit file metadata and move an asset to a folder', () => {
    // Given a destination folder "Coaching Staff" is created (success toast shown) and appears after reload
    // When I open the details drawer for "ted_lasso_profile.jpeg" from table view
    // Then a "Save" button is shown that starts disabled (no changes yet)
    test.todo('AC2.1 — I open the details drawer for "ted_lasso_profile.jpeg" from table view');

    // Given the details drawer for "ted_lasso_profile.jpeg" is open
    // When I edit "File name" to "head_coach_profile.jpeg", edit "Alternative text" to "Head coach Ted Lasso", and select the "Coaching Staff" folder in the Location select
    // Then the "Save" button is enabled
    test.todo('AC2.2 — I edit "File name" to "head_coach_profile.jpeg", edit "Alternative te…');

    // Given the changes have been made in the drawer
    // When I save
    // Then the changes persist (success toast)
    test.todo('AC2.3 — I save');

    // Given the asset has been saved into the "Coaching Staff" folder
    // When I close the drawer and view the Media Library root in grid view
    // Then the asset no longer appears there ("ted_lasso_profile.jpeg" count is 0)
    test.todo('AC2.4 — I close the drawer and view the Media Library root in grid view');

    // Given the asset has been moved to the "Coaching Staff" folder
    // When I navigate into the "Coaching Staff" folder
    // Then the renamed "head_coach_profile.jpeg" card is shown
    test.todo('AC2.5 — I navigate into the "Coaching Staff" folder');
  });
});
