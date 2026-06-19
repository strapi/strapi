import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/media-library/future/file-upload.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Media Library File Upload (Unstable)', () => {
  describe('Upload a single file via the file picker', () => {
    // Given the Media Library
    // When I upload a file via the file picker
    // Then the upload progress dialog appears and reaches success
    test.todo('AC1.1 — I upload a file via the file picker');

    // Given the upload progress dialog has reached success
    // When I close it
    // Then it is no longer visible
    test.todo('AC1.2 — I close it');
  });

  describe('Upload multiple files', () => {
    // Given the Media Library
    // When I upload two files via the file picker
    // Then the upload progress dialog reaches success
    test.todo('AC2.1 — I upload two files via the file picker');

    // Given the upload progress dialog has reached success
    // When I close it
    // Then the dialog is closed
    test.todo('AC2.2 — I close it');
  });

  describe('Uploaded file appears in the table view', () => {
    // Given table view and a file has been uploaded with the progress dialog reaching success and being closed
    // When I view the table
    // Then the "test-image" asset row is visible
    test.todo('AC3.1 — I view the table');
  });

  describe('Upload a file via drag and drop', () => {
    // Given table view
    // When I drop a file
    // Then the upload progress dialog reaches success
    test.todo('AC4.1 — I drop a file');

    // Given the dropped file has been uploaded and the dialog closed
    // When I view the table
    // Then the "test-image" asset row is visible
    test.todo('AC4.2 — I view the table');
  });

  describe('Upload a file from a URL', () => {
    // Given the Media Library
    // When I upload an asset from a URL
    // Then the upload progress dialog reaches success
    test.todo('AC5.1 — I upload an asset from a URL');

    // Given the upload progress dialog has reached success
    // When I close it
    // Then it is no longer visible
    test.todo('AC5.2 — I close it');
  });
});
