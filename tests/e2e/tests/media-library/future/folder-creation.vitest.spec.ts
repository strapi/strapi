import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/media-library/future/folder-creation.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Media Library Folder Creation (Unstable)', () => {
  describe('Create a folder from the root', () => {
    // Given the Media Library root
    // When I open the create-folder dialog
    // Then the dialog shows the text "New folder in Home"
    test.todo('AC1.1 — I open the create-folder dialog');

    // Given the create-folder dialog is open
    // When I fill the name "Test Folder" and click "Create folder"
    // Then it succeeds (success toast)
    test.todo('AC1.2 — I fill the name "Test Folder" and click "Create folder"');

    // Given the "Test Folder" folder has been created
    // When I view grid view
    // Then the "Test Folder" folder card is visible
    test.todo('AC1.3 — I view grid view');
  });

  describe('Create a subfolder inside an existing folder', () => {
    // Given "Parent Folder" has been created and I have navigated into it
    // When I open the create-folder dialog
    // Then it shows "New folder in Parent Folder"
    test.todo('AC2.1 — I open the create-folder dialog');

    // Given the create-folder dialog inside "Parent Folder" is open
    // When I create a "Sub Folder"
    // Then it succeeds
    test.todo('AC2.2 — I create a "Sub Folder"');
  });

  describe('Cancel folder creation', () => {
    // Given the create-folder dialog is open
    // When I type "Cancelled Folder" and click "Cancel"
    // Then the dialog closes
    test.todo('AC3.1 — I type "Cancelled Folder" and click "Cancel"');
  });

  describe('Inline error for duplicate folder name', () => {
    // Given a folder named "Duplicate" has been created
    // When I attempt to create another folder named "Duplicate"
    // Then an inline "already exists" error is shown below the input
    test.todo('AC4.1 — I attempt to create another folder named "Duplicate"');
  });

  describe('Form resets when the dialog is reopened', () => {
    // Given I have typed "Some Folder" and cancelled
    // When I reopen the dialog
    // Then the textbox is empty
    test.todo('AC5.1 — I reopen the dialog');
  });
});
