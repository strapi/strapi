import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/admin/home.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Homepage Widgets & Personalization', () => {
  describe('See a personalized greeting on the homepage', () => {
    // Given I have logged in
    // When I view the homepage
    // Then it shows "Hello test"
    test.todo('AC1.1 — I view the homepage');

    // Given I am logged in
    // When I edit my profile first name to "Rebecca", save, and return Home
    // Then the homepage shows "Hello Rebecca"
    test.todo('AC1.2 — I edit my profile first name to "Rebecca", save, and return Home');
  });

  describe('See my profile information widget', () => {
    // Given I am on the homepage
    // When I view the Profile widget
    // Then it is visible
    test.todo('AC2.1 — I view the Profile widget');

    // Given the Profile widget is visible
    // When I click "Profile settings", update first name to "Ted", last name to "Lasso", and email to "ted.lasso@afcrichmond.co.uk", save, and return Home
    // Then the Profile widget shows "Ted Lasso" and "ted.lasso@afcrichmond.co.uk"
    test.todo('AC2.2 — I click "Profile settings", update first name to "Ted", last name to…');
  });

  describe('See live key statistics as a super admin', () => {
    // Given I am a super admin on the homepage
    // When I view the "project statistics" widget
    // Then it is visible
    test.todo('AC3.1 — I view the "project statistics" widget');

    // Given the initial counts can be parsed
    // When I create one of each item
    // Then the widget reflects the incremented counts:
    test.todo('AC3.2 — I create one of each item');

    // Given the count assertions have passed
    // When the test cleans up
    // Then the newly created collection type and component are deleted to reset the dataset (with a server restart)
    test.todo('AC3.3 — the test cleans up');
  });

  describe('See the Deploy Now widget as a super admin', () => {
    // Given I am a super admin on the homepage
    // When I view the "Deploy" widget
    // Then it is visible
    test.todo('AC4.1 — I view the "Deploy" widget');
  });

  describe('Key statistics widget hidden from non-super-admins', () => {
    // Given I have logged in as an editor (non-super-admin)
    // When I view the homepage
    // Then the "project statistics" widget is not visible
    test.todo('AC5.1 — I view the homepage');
  });

  describe('Deploy widget visible to all roles', () => {
    // Given I have logged in as an editor (non-super-admin)
    // When I view the homepage
    // Then the "Deploy" widget is visible
    test.todo('AC6.1 — I view the homepage');
  });
});
