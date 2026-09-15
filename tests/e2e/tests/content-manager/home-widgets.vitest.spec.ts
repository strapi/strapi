import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/home-widgets.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Homepage Content Manager Widgets', () => {
  describe('See the last edited entries', () => {
    // Given I am on the homepage
    // When I view it
    // Then the "last edited entries" widget is visible
    test.todo('AC1.1 — I view it');

    // Given the "last edited entries" widget
    // When I edit a Products entry (renaming "Nike Mens" to "Nike Mens newer!"), save, and return to the homepage
    // Then that entry is shown as the first row in the widget
    test.todo('AC1.2 — I edit a Products entry (renaming "Nike Mens" to "Nike Mens newer!"),…');
  });

  describe('See the last published entries', () => {
    // Given I am on the homepage
    // When I view it
    // Then the "last published entries" widget is visible
    test.todo('AC2.1 — I view it');

    // Given the "last published entries" widget
    // When I publish an Article ("West Ham post match analysis") and return to the homepage
    // Then it is shown as the first row with status "Published"
    test.todo('AC2.2 — I publish an Article ("West Ham post match analysis") and return to t…');

    // Given the published Article is shown in the widget
    // When I modify and save that Article (changing the title to "West Ham pre match pep talk")
    // Then the widget's first row still shows the published title ("West Ham post match analysis", not the modified draft) with status "Modified"
    test.todo('AC2.3 — I modify and save that Article (changing the title to "West Ham pre m…');
  });

  describe('See published entries per locale', () => {
    // Given I have created and published an English Article ("West Ham Football Team") and a French Article ("L'équipe de West Ham")
    // When I view the homepage "last published entries" widget
    // Then both the English and the French entries are shown
    test.todo('AC3.1 — I view the homepage "last published entries" widget');
  });

  describe('See the entries chart widget', () => {
    // Given I am on the homepage
    // When I view it
    // Then the "Entries" chart widget is visible
    test.todo('AC4.1 — I view it');

    // Given the chart shows the draft arc
    // When I focus the draft arc
    // Then a tooltip with the draft count is shown
    test.todo('AC4.2 — I focus the draft arc');

    // Given the chart
    // When I publish two entries, modify one of them, and return to the homepage
    // Then "Draft", "Modified", and "Published" are all visible in the chart
    test.todo('AC4.3 — I publish two entries, modify one of them, and return to the homepage');
  });
});
