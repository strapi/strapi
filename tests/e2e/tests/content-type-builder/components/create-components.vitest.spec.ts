import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-type-builder/components/create-components.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Create a Component', () => {
  describe('Create a component in a new category', () => {
    // Given the Content-Type Builder is open
    // When the user creates a component "TestNewComponent" in a new category "BlogPosts" with the "paint" icon and a single text attribute ("sometextfield")
    // Then the component is created
    test.todo('AC1.1 — the user creates a component "TestNewComponent" in a new category "Bl…');
  });

  describe('Create a component covering every field type', () => {
    // Given the Content-Type Builder is open
    // When the user creates a component "ArticlesComponent" in the existing "product" category with the "paint" icon
    // Then the component is created
    test.todo('AC2.1 — the user creates a component "ArticlesComponent" in the existing "pro…');

    // Given the "ArticlesComponent" component is open
    // When the user adds Text fields with advanced settings
    // Then they can be configured with a required flag and a regex pattern (`^(?!.*fail).*`)
    test.todo('AC2.2 — the user adds Text fields with advanced settings');

    // Given the component is open
    // When the user adds the scalar field types boolean, blocks, json, email, password, and markdown
    // Then each can be added and marked required
    test.todo('AC2.3 — the user adds the scalar field types boolean, blocks, json, email, pa…');

    // Given the component is open
    // When the user adds Number fields
    // Then they can be added in integer, big integer, and decimal formats
    test.todo('AC2.4 — the user adds Number fields');

    // Given the component is open
    // When the user adds Date fields
    // Then they can be added in date, time, and datetime formats
    test.todo('AC2.5 — the user adds Date fields');

    // Given the component is open
    // When the user adds Media fields
    // Then they can be added for both single and multiple media
    test.todo('AC2.6 — the user adds Media fields');

    // Given the component is open
    // When the user adds Relation fields for the oneWay and manyWay types
    // Then each can be added targeting the "Article" content type
    test.todo('AC2.7 — the user adds Relation fields for the oneWay and manyWay types');

    // Given the component is open
    // When the user adds an enumeration field
    // Then it can be added with the values first, second, and third
    test.todo('AC2.8 — the user adds an enumeration field');

    // Given the component is open
    // When the user adds a nested new single component in a newly created category ("testcategory")
    // Then it can be added with its own text attribute
    test.todo('AC2.9 — the user adds a nested new single component in a newly created catego…');

    // Given the "testcategory" category exists
    // When the user adds a nested new repeatable component
    // Then it can be added in the existing "testcategory" category
    test.todo('AC2.10 — the user adds a nested new repeatable component');

    // Given an existing component is available
    // When the user reuses it
    // Then it can be nested under an existing category
    test.todo('AC2.11 — the user reuses it');
  });
});
