import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/uniqueness.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Uniqueness', () => {
  describe('Enforce unique field values within the same content type and dimensions', () => {
    // Given every document-level unique field type on the Unique content type — scalar fields (uniqueString, uniqueNumber, uniqueEmail, uniqueDate, UID), single-component fields (ComponentTextShort, ComponentTextLong, ComponentNumberInteger, ComponentNumberFloat, ComponentEmail), and repeatable-component fields (the same set)
    // When the following scenarios are run
    // Then each behaves as described below
    test.todo('AC1.1 — the following scenarios are run');

    // Given a repeatable component field
    // When I add two entries with the same value within one document and attempt to publish
    // Then a "2 errors occurred" alert is shown (the duplicate entry within the same document is rejected)
    test.todo('AC1.2 — I add two entries with the same value within one document and attempt…');

    // Given the Unique content type
    // When I create and save a first entry with a given unique value
    // Then a "Saved document" confirmation appears
    test.todo('AC1.3 — I create and save a first entry with a given unique value');

    // Given a first entry with a unique value exists
    // When I create, save, and publish a second entry with the same value
    // Then publishing succeeds
    test.todo('AC1.4 — I create, save, and publish a second entry with the same value');

    // Given an already-published value in the same locale/state
    // When I create and save a third entry with the same value and attempt to publish it
    // Then a "This attribute must be unique" alert is shown (the duplicate is rejected)
    test.todo('AC1.5 — I create and save a third entry with the same value and attempt to pu…');

    // Given the same value already used in the default locale
    // When I switch to the French (fr) locale and create, save, and publish an entry with that value
    // Then it succeeds ("Saved document" then "Published document") — uniqueness is scoped per locale
    test.todo('AC1.6 — I switch to the French (fr) locale and create, save, and publish an e…');
  });
});
