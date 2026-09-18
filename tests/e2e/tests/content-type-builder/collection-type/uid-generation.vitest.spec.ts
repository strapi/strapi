import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-type-builder/collection-type/uid-generation.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Content Type UID Generation', () => {
  describe('Generate the UID from the singular name, not the display name', () => {
    // Given the Content-Type Builder is open
    // When the user creates a new collection type
    // Then a "Create a collection type" modal opens
    test.todo('AC1.1 — the user creates a new collection type');

    // Given the "Create a collection type" modal is open
    // When the user enters a display name of "Members"
    // Then the API IDs are auto-generated after a short delay
    test.todo('AC1.2 — the user enters a display name of "Members"');

    // Given the API IDs have been auto-generated
    // When the user manually changes the singular API ID to "member"
    // Then it retains that value
    test.todo('AC1.3 — the user manually changes the singular API ID to "member"');

    // Given singular "member" and plural "members" are set
    // When the user continues, adds a Text field named "title", saves, and the server restarts
    // Then the "Members" content type appears in the list
    test.todo('AC1.4 — the user continues, adds a Text field named "title", saves, and the s…');

    // Given the "Members" content type exists
    // When the user opens it
    // Then the URL ends with `content-types/api::member.member`, confirming the UID uses the singular name "member" rather than "members"
    test.todo('AC1.5 — the user opens it');
  });

  describe('Block creation when singular and plural names are identical', () => {
    // Given the "Create a collection type" modal is open
    // When the user enters "Cities" as the display name
    // Then the singular API ID is auto-generated as "cities" (slugified, not singularized)
    test.todo('AC2.1 — the user enters "Cities" as the display name');

    // Given the singular and plural API IDs are both "cities"
    // When the user clicks "Continue"
    // Then continuing is blocked
    test.todo('AC2.2 — the user clicks "Continue"');

    // Given the names are identical
    // When the user corrects the singular API ID to "city"
    // Then continuing to the field-addition screen is allowed ("Add new field" becomes visible)
    test.todo('AC2.3 — the user corrects the singular API ID to "city"');

    // Given the field-addition screen is shown
    // When the user adds a Text field named "name", saves, and the server restarts
    // Then the "Cities" content type appears in the list
    test.todo('AC2.4 — the user adds a Text field named "name", saves, and the server restar…');
  });
});
