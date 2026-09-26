import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-type-builder/components/edit-components.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Edit a Component', () => {
  describe('Add an attribute to a component and see it propagate', () => {
    // Given "SomeComponent" exists
    // When the user adds a required text attribute "addedtext" (with regex `^(?!.*fail).*`)
    // Then the attribute is added
    test.todo('AC1.1 — the user adds a required text attribute "addedtext" (with regex `^(?!…');

    // Given the "addedtext" attribute has been added to "SomeComponent"
    // When the user views the collection type "Mycollectiontype"
    // Then the "addedtext" attribute is visible
    test.todo('AC1.2 — the user views the collection type "Mycollectiontype"');

    // Given the "addedtext" attribute has been added to "SomeComponent"
    // When the user views the single type "Singletypepage"
    // Then the "addedtext" attribute is visible
    test.todo('AC1.3 — the user views the single type "Singletypepage"');
  });

  describe('Remove an attribute from a component and see it propagate', () => {
    // Given "SomeComponent" has a "testtext" attribute
    // When the user views the collection type and the single type
    // Then the "testtext" attribute is initially visible on both
    test.todo('AC2.1 — the user views the collection type and the single type');

    // Given the "testtext" attribute is removed from "SomeComponent"
    // When the user views the collection type
    // Then "testtext" is no longer visible
    test.todo('AC2.2 — the user views the collection type');

    // Given the "testtext" attribute is removed from "SomeComponent"
    // When the user views the single type
    // Then "testtext" is no longer visible
    test.todo('AC2.3 — the user views the single type');
  });

  describe('Delete a component and see it removed everywhere', () => {
    // Given "SomeComponent" is embedded via the component field "mycomponentname"
    // When the user views the collection type and the single type
    // Then the component field "mycomponentname" is initially visible on both
    test.todo('AC3.1 — the user views the collection type and the single type');

    // Given "SomeComponent" is deleted
    // When the user views the collection type
    // Then the component field is no longer visible
    test.todo('AC3.2 — the user views the collection type');

    // Given "SomeComponent" is deleted
    // When the user views the single type
    // Then the component field is no longer visible
    test.todo('AC3.3 — the user views the single type');

    // Given "SomeComponent" is deleted
    // When the user views the navigation
    // Then it is no longer visible
    test.todo('AC3.4 — the user views the navigation');
  });
});
