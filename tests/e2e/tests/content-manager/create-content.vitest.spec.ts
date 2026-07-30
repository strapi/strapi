import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/create-content.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Adding Content', () => {
  describe('Save and publish content', () => {
    // Given the Match content type
    // When I fill the required "opponent" text field with a value (e.g. "testname") and save the entry
    // Then the entry is saved
    test.todo('AC1.1 — I fill the required "opponent" text field with a value (e.g. "testnam…');

    // Given the saved entry
    // When I publish it
    // Then the entry is published
    test.todo('AC1.2 — I publish it');
  });

  describe('Set component order when creating content', () => {
    // Given I am creating a Match entry with an "opponent" text field and a dynamic zone ("sections") containing a "player" component (full_name "Roy Kent") and a "variations" component (name "Roy Kent Shirt Jersey")
    // When I drag the "variations" component above the "player" component
    // Then the "variations" component is positioned before the "player" component
    test.todo('AC2.1 — I drag the "variations" component above the "player" component');

    // Given the reordered components
    // When I save the entry
    // Then a "Saved Document" confirmation appears
    test.todo('AC2.2 — I save the entry');
  });

  describe('See validation errors when publishing invalid required/regex fields', () => {
    // Given a Match with an empty required text field ("opponent")
    // When I publish it
    // Then the error "This value is required" is shown
    test.todo('AC3.1 — I publish it');

    // Given a Match where the "opponent" text field violates its regex (value "richmond")
    // When I publish it
    // Then "The value does not match the regex" is shown
    test.todo('AC3.2 — I publish it');

    // Given an empty required text field inside a single component
    // When I publish
    // Then "This value is required" is shown
    test.todo('AC3.3 — I publish');

    // Given a regex-violating value inside a single component
    // When I publish
    // Then "The value does not match the regex" is shown
    test.todo('AC3.4 — I publish');

    // Given an empty required text field inside a repeatable component
    // When I publish
    // Then "This value is required" is shown
    test.todo('AC3.5 — I publish');

    // Given a regex-violating value inside a repeatable component
    // When I publish
    // Then "The value does not match the regex" is shown
    test.todo('AC3.6 — I publish');

    // Given an empty required text field inside a dynamic zone component
    // When I publish
    // Then "This value is required" is shown
    test.todo('AC3.7 — I publish');

    // Given a regex-violating value inside a dynamic zone component
    // When I publish
    // Then "The value does not match the regex" is shown
    test.todo('AC3.8 — I publish');
  });
});
