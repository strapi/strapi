import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/review-workflows/settings.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Review Workflows Settings', () => {
  describe('Create a new workflow with three stages', () => {
    // Given the user is on Settings > Review Workflows
    // When "Create new workflow" is clicked
    // Then the creation form opens
    test.todo('AC1.1 — "Create new workflow" is clicked');

    // Given the creation form is open
    // When the workflow is named "Articles", associated to the "Author" content type, and three stages are added with names and colors Draft (Blue), Review (Lilac), Published (Green), then saved
    // Then "Created workflow" is shown
    test.todo('AC1.2 — the workflow is named "Articles", associated to the "Author" content…');

    // Given the "Articles" workflow is associated to the "Author" content type
    // When an Author entry ("Ted Lasso") is opened
    // Then the "REVIEW WORKFLOWS" panel is shown with "Assignee" and "Review stage" comboboxes
    test.todo('AC1.3 — an Author entry ("Ted Lasso") is opened');
  });

  describe('Edit an existing workflow', () => {
    // Given the "Default" workflow is open
    // When it is renamed to "Updated Workflow", a new stage "New Stage" is added with color Yellow, and the workflow is saved
    // Then "Updated Workflow" is shown
    test.todo('AC2.1 — it is renamed to "Updated Workflow", a new stage "New Stage" is added…');

    // Given the workflow has been saved
    // Then the page heading shows "Updated Workflow"
    test.todo('AC2.2 — the page heading shows "Updated Workflow"');
  });

  describe('Set a required stage for publishing', () => {
    // Given a "Publish Workflow" associated to "Author" with stages Draft (Blue), Review (Lilac), Done (Green) is being created
    // When the "Required stage for publishing" is set to "Done" and the workflow is saved
    // Then "Created workflow" is shown
    test.todo('AC3.1 — the "Required stage for publishing" is set to "Done" and the workflow…');

    // Given an Author entry ("Ted Lasso") has not reached the required stage
    // When publishing is attempted
    // Then "Entry is not at the required stage to publish" is shown
    test.todo('AC3.2 — publishing is attempted');

    // Given the Author entry is below the required stage
    // When the "Review stage" is changed to "Done"
    // Then "Review stage updated" is shown
    test.todo('AC3.3 — the "Review stage" is changed to "Done"');

    // Given the Author entry is at the required "Done" stage
    // When publishing is attempted
    // Then it succeeds, showing "Published document"
    test.todo('AC3.4 — publishing is attempted');
  });
});
