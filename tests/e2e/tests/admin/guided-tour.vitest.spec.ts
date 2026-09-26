import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/admin/guided-tour.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Guided Tour', () => {
  describe('Greeted with the Guided Tour Overview', () => {
    // Given the guided tour is enabled
    // When I log in and view the homepage
    // Then a heading "Discover your application!" is shown
    test.todo('AC1.1 — I log in and view the homepage');
  });

  describe('Complete every guided tour step end to end', () => {
    // Given the "Start" link for "Create your schema" is enabled
    // When I click it
    // Then I navigate to the Content-Type Builder
    test.todo('AC2.1 — I click it');

    // Given I am in the Content-Type Builder tour
    // When I create a new collection type named "guided tour" and click Continue
    // Then I reach the schema editor
    test.todo('AC2.2 — I create a new collection type named "guided tour" and click Continue');

    // Given I am in the schema editor
    // When I add a Text field named "testField" and click Finish
    // Then a "Don't leave without saving!" dialog appears, which I dismiss before Saving and waiting for the server restart
    test.todo('AC2.3 — I add a Text field named "testField" and click Finish');

    // Given the schema has saved
    // When a "First Step: Done! 🎉" dialog appears and I click Next
    // Then I am routed to the Content Manager for `api::guided-tour.guided-tour`
    test.todo('AC2.4 — a "First Step: Done! 🎉" dialog appears and I click Next');

    // Given I return to the homepage
    // When I view the tour progress
    // Then "Create your schema" shows "Done"
    test.todo('AC2.5 — I view the tour progress');

    // Given I am on the homepage
    // When I click "Start"
    // Then a "Content Manager" dialog opens, then a "Create new entry" popover
    test.todo('AC2.6 — I click "Start"');

    // Given the Content Manager tour is in progress
    // When I fill the Title with "Test" and Publish
    // Then a "Time to setup API tokens!" dialog appears, and clicking Next routes to `/admin/settings/api-tokens`
    test.todo('AC2.7 — I fill the Title with "Test" and Publish');

    // Given I return to the homepage
    // When I view the tour progress
    // Then "Create and publish content" shows "Done"
    test.todo('AC2.8 — I view the tour progress');

    // Given I am on the homepage
    // When I click "Start"
    // Then a "Last but not least, API tokens" dialog is shown, then a "Manage an API token" popover
    test.todo('AC2.9 — I click "Start"');

    // Given the API Tokens tour is in progress
    // When I edit the "Read Only" token
    // Then a "View API token" dialog opens, dismissed with "Got it"
    test.todo('AC2.10 — I edit the "Read Only" token');

    // Given I am viewing the "Read Only" token
    // When I regenerate the token
    // Then a "Copy your API token" dialog appears, which I dismiss before clicking Copy
    test.todo('AC2.11 — I regenerate the token');

    // Given I return to the homepage
    // When I view the tour progress
    // Then "Copy an API token" shows "Done"
    test.todo('AC2.12 — I view the tour progress');

    // Given I am on the homepage
    // When I click "Read documentation"
    // Then the Strapi Cloud step is marked as completed in storage
    test.todo('AC2.13 — I click "Read documentation"');
  });
});
