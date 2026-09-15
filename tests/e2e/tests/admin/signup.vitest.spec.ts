import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/admin/signup.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Admin Sign Up (First Administrator)', () => {
  describe('First name is required to sign up', () => {
    // Given I am on the sign-up form
    // When I clear the First name field and click "Let's start"
    // Then focus stays on the First name field
    test.todo('AC1.1 — I clear the First name field and click "Let\'s start"');
  });

  describe('Email must be provided, lowercase, and valid', () => {
    // Given I am on the sign-up form
    // When I submit an empty email
    // Then focus stays on the Email field
    test.todo('AC2.1 — I submit an empty email');

    // Given I am on the sign-up form
    // When I submit an uppercase email
    // Then "The value must be a lowercase string" is shown
    test.todo('AC2.2 — I submit an uppercase email');

    // Given I am on the sign-up form
    // When I submit "notanemail"
    // Then "This is not a valid email" is shown
    test.todo('AC2.3 — I submit "notanemail"');
  });

  describe('Password must meet strength requirements and match confirmation', () => {
    // Given I am on the sign-up form
    // When I submit an empty password
    // Then focus stays on the Password field
    test.todo('AC3.1 — I submit an empty password');

    // Given I am on the sign-up form
    // When I submit a password with no number ("noNumberInHere")
    // Then "Password must contain at least one number" is shown
    test.todo('AC3.2 — I submit a password with no number ("noNumberInHere")');

    // Given I am on the sign-up form
    // When I submit a password with no uppercase character ("lowerca5e")
    // Then "Password must contain at least one uppercase character" is shown
    test.todo('AC3.3 — I submit a password with no uppercase character ("lowerca5e")');

    // Given I am on the sign-up form
    // When I submit a too-short password ("S4ort")
    // Then "The value is too short" is shown
    test.todo('AC3.4 — I submit a too-short password ("S4ort")');

    // Given I am on the sign-up form
    // When I submit a confirmation that differs ("doesNotMatch")
    // Then "Passwords do not match" is shown
    test.todo('AC3.5 — I submit a confirmation that differs ("doesNotMatch")');
  });

  describe('Sign up successfully on a fresh instance', () => {
    // Given a valid sign-up form is filled in
    // When I click "Let's start"
    // Then I land on the home page (page title is the home title)
    test.todo('AC4.1 — I click "Let\'s start"');
  });

  describe('Opting into news redirects to the use-case page', () => {
    // Given a valid sign-up form is filled in
    // When I check "Keep me updated" and click "Let's start"
    // Then I navigate to a URL containing `/usecase`
    test.todo('AC5.1 — I check "Keep me updated" and click "Let\'s start"');
  });
});
