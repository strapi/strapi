import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-type-builder/collection-type/create-collection-type.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Create a Collection Type with All Field Types', () => {
  describe('Create a collection type covering every field type', () => {
    // Given the Content-Type Builder is open
    // When the user creates a collection type named "Secret Document" (singular id `secret-document`, plural id `secret-documents`)
    // Then the collection type is created end to end
    test.todo('AC1.1 — the user creates a collection type named "Secret Document" (singular…');

    // Given the new collection type is open
    // When the user adds Text fields with advanced settings
    // Then they can be configured with a required flag and a regex pattern (`^(?!.*fail).*`)
    test.todo('AC1.2 — the user adds Text fields with advanced settings');

    // Given the new collection type is open
    // When the user adds the scalar field types boolean, blocks, json, email, password, and markdown
    // Then each can be added and marked required
    test.todo('AC1.3 — the user adds the scalar field types boolean, blocks, json, email, pa…');

    // Given the new collection type is open
    // When the user adds Number fields
    // Then they can be added in integer, big integer, and decimal formats
    test.todo('AC1.4 — the user adds Number fields');

    // Given the new collection type is open
    // When the user adds Date fields
    // Then they can be added in date, time, and datetime formats
    test.todo('AC1.5 — the user adds Date fields');

    // Given the new collection type is open
    // When the user adds Media fields
    // Then they can be added for both single and multiple media
    test.todo('AC1.6 — the user adds Media fields');

    // Given the new collection type is open
    // When the user adds Relation fields for every relation type (oneWay, oneToOne, oneToMany, manyToOne, manyToMany, manyWay)
    // Then each can be added targeting the "Article" content type
    test.todo('AC1.7 — the user adds Relation fields for every relation type (oneWay, oneToO…');

    // Given the new collection type is open
    // When the user adds an enumeration field
    // Then it can be added with the values first, second, and third
    test.todo('AC1.8 — the user adds an enumeration field');

    // Given the new collection type is open
    // When the user adds a new single (non-repeatable) component in a newly created category ("testcategory")
    // Then it can be added with its own text attribute and icon
    test.todo('AC1.9 — the user adds a new single (non-repeatable) component in a newly crea…');

    // Given the "testcategory" category exists
    // When the user adds a new repeatable component
    // Then it can be added in the existing "testcategory" category
    test.todo('AC1.10 — the user adds a new repeatable component');

    // Given an existing component is available
    // When the user reuses it
    // Then it can be added under an existing category
    test.todo('AC1.11 — the user reuses it');

    // Given the new collection type is open
    // When the user adds a dynamic zone containing a newly created component (with its own category, icon, and text attribute)
    // Then the dynamic zone can be added
    test.todo('AC1.12 — the user adds a dynamic zone containing a newly created component (wi…');
  });
});
