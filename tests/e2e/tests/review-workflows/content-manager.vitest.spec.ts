import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/review-workflows/content-manager.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Review Workflows in the Content Manager', () => {
  describe('Assign a document to a user and see it reflected in the list view', () => {
    // Given the "West Ham post match analysis" entry is open and the "Assignee" combobox is visible
    // When "editor testing" is selected as assignee
    // Then "Assignee updated" is shown
    test.todo('AC1.1 — "editor testing" is selected as assignee');

    // Given the assignee has been set to "editor testing"
    // When going back to the list view
    // Then a gridcell "editor testing" is shown
    test.todo('AC1.2 — going back to the list view');

    // Given the assignee has been set to "editor testing"
    // When the entry is reopened
    // Then the "Assignee" combobox still reads "editor testing"
    test.todo('AC1.3 — the entry is reopened');
  });

  describe('Change the review stage of a document and see it in the list view', () => {
    // Given the "West Ham post match analysis" entry is open and the "Review stage" combobox is visible
    // When "In progress" is selected
    // Then "Review stage updated" is shown
    test.todo('AC2.1 — "In progress" is selected');

    // Given the review stage has been set to "In progress"
    // When going back to the list view
    // Then a gridcell "In progress" is shown
    test.todo('AC2.2 — going back to the list view');

    // Given the review stage has been set to "In progress"
    // When the entry is reopened
    // Then the "Review stage" combobox still reads "In progress"
    test.todo('AC2.3 — the entry is reopened');
  });

  describe('Change assignee from the preview view (unstable preview)', () => {
    // Given the preview for the "West Ham post match" Article is open
    // When the assignee is set to "editor testing"
    // Then "Assignee updated" is shown
    test.todo('AC3.1 — the assignee is set to "editor testing"');

    // Given the assignee was set to "editor testing" in the preview
    // When the preview is closed
    // Then the edit view's "Assignee" combobox reads "editor testing"
    test.todo('AC3.2 — the preview is closed');
  });

  describe('Change review stage from the preview view (unstable preview)', () => {
    // Given the preview for the "West Ham post match" Article is open
    // When the stage is set to "In progress"
    // Then "Review stage updated" is shown
    test.todo('AC4.1 — the stage is set to "In progress"');

    // Given the stage was set to "In progress" in the preview
    // When the preview is closed
    // Then the edit view's "Review stage" combobox reads "In progress"
    test.todo('AC4.2 — the preview is closed');
  });
});
