import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/listview.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('List View', () => {
  describe('Filter entries by a field', () => {
    // Given the Article list view
    // When I open "Filters", select the "documentId" field, enter a documentId value, and add the filter
    // Then the applied filter chip "documentId is <value>" is shown
    test.todo('AC1.1 — I open "Filters", select the "documentId" field, enter a documentId v…');
  });

  describe('Filter by Draft status', () => {
    // Given the Article list view
    // When I open "Filters", choose the "Status" field, select "Draft (never published)", and add the filter
    // Then the applied filter chip "Status is draft" is shown
    test.todo('AC2.1 — I open "Filters", choose the "Status" field, select "Draft (never pub…');
  });

  describe('Filter by Published status', () => {
    // Given the Article list view
    // When I bulk-publish all (2) Article entries
    // Then both show a "published" status cell
    test.todo('AC3.1 — I bulk-publish all (2) Article entries');

    // Given the entries are published
    // When I apply the "Status" = "Published (all)" filter
    // Then the chip "Status is published" is shown
    test.todo('AC3.2 — I apply the "Status" = "Published (all)" filter');
  });

  describe('Filter by Published when nothing is published', () => {
    // Given 2 draft articles and none published
    // When I apply the "Status" = "Published (all)" filter
    // Then the chip "Status is published" is shown
    test.todo('AC4.1 — I apply the "Status" = "Published (all)" filter');
  });

  describe('Navigate to the list view and see entries', () => {
    // Given the admin panel
    // When I click "Content Manager"
    // Then the Article list view opens
    test.todo('AC5.1 — I click "Content Manager"');
  });

  describe('Paginate entries', () => {
    // Given the Author list view
    // When the page fits
    // Then all 3 draft entries are shown with no "Next page" link
    test.todo('AC6.1 — the page fits');

    // Given the Author list view
    // When I set `pageSize=2` in the URL
    // Then pagination is forced
    test.todo('AC6.2 — I set `pageSize=2` in the URL');

    // Given the first page of paginated results
    // When I click "Next page"
    // Then the second page shows 1 draft cell, includes "Ted Lasso" but not "Coach Beard"
    test.todo('AC6.3 — I click "Next page"');
  });

  describe('Perform bulk publish, unpublish, and delete', () => {
    // Given the list view (bulk publish)
    // When I select all entries and click "Publish"
    // Then a "Publish entries" modal opens showing "Already published 0", "Ready to publish 2", "Waiting for action 0", and "Ready to publish changes 0", with both entries pre-checked
    test.todo('AC7.1 — I select all entries and click "Publish"');

    // Given the "Publish entries" modal
    // When I uncheck "Select all entries"
    // Then the counts reset to 0
    test.todo('AC7.2 — I uncheck "Select all entries"');

    // Given the "Publish entries" modal
    // When I re-check and click "Publish"
    // Then I am prompted "Are you sure you want to publish these entries?"
    test.todo('AC7.3 — I re-check and click "Publish"');

    // Given published entries (bulk unpublish)
    // When I select all and click "Unpublish"
    // Then I am prompted "Are you sure you want to unpublish these entries?"
    test.todo('AC7.4 — I select all and click "Unpublish"');

    // Given the list view (bulk delete)
    // When I select all and click "Delete"
    // Then I am prompted "Are you sure you want to delete these entries?"
    test.todo('AC7.5 — I select all and click "Delete"');
  });
});
