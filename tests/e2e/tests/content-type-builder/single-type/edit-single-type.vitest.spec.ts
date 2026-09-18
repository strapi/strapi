import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-type-builder/single-type/edit-single-type.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../../vitest/browser-fixture';
// import { expect } from '../../../vitest/expect';

describe('Edit a Single Type', () => {
  describe('Change a relation type from manyToOne to oneToOne', () => {
    // Given the "Homepage" single type is open
    // When the user adds a relation field targeting the "Product" content type and saves
    // Then after restart the "product" field is visible
    test.todo('AC1.1 — the user adds a relation field targeting the "Product" content type a…');

    // Given the "product" relation field exists
    // When the user edits the relation, changes its type to oneToOne, and saves
    // Then after restart the "product" field is still visible
    test.todo('AC1.2 — the user edits the relation, changes its type to oneToOne, and saves');
  });

  describe('Toggle internationalization', () => {
    // Given the "Homepage" single type is open
    // When the user disables Internationalization (Advanced settings -> "Internationalization" -> "Yes, disable" -> Finish -> Save)
    // Then the save succeeds
    test.todo('AC2.1 — the user disables Internationalization (Advanced settings -> "Interna…');

    // Given Internationalization has been disabled
    // When the user re-enables Internationalization
    // Then no data-loss confirmation is prompted, demonstrating it was actually disabled
    test.todo('AC2.2 — the user re-enables Internationalization');
  });

  describe('Toggle draft & publish', () => {
    // Given the "Homepage" single type is open
    // When the user disables "Draft & publish" (Advanced settings -> "Yes, disable" -> Finish -> Save)
    // Then the save succeeds
    test.todo('AC3.1 — the user disables "Draft & publish" (Advanced settings -> "Yes, disab…');

    // Given "Draft & publish" has been disabled
    // When the user re-enables "Draft & publish"
    // Then no data-loss confirmation is prompted, demonstrating it was actually disabled
    test.todo('AC3.2 — the user re-enables "Draft & publish"');
  });

  describe('Add a field with a default value', () => {
    // Given the "Homepage" single type is open
    // When the user adds a Text field named "testfield" with a default value "mydefault" (set under Advanced settings) and saves
    // Then after restart the heading is visible
    test.todo('AC4.1 — the user adds a Text field named "testfield" with a default value "my…');
  });

  describe('Configure advanced settings for multiple fields sequentially', () => {
    // Given the "Homepage" single type is open
    // When the user opens the editor to add each text field
    // Then the "Basic settings" tab is active
    test.todo('AC5.1 — the user opens the editor to add each text field');

    // Given the field editor is open for each of two fields
    // When the user sets a default value on the Advanced settings tab ("testfield"/"mydefault" and "testfield2"/"mydefault2") before finishing
    // Then the default values are applied
    test.todo('AC5.2 — the user sets a default value on the Advanced settings tab ("testfiel…');

    // Given both fields have been added
    // When the user saves and the server restarts
    // Then the heading is visible
    test.todo('AC5.3 — the user saves and the server restarts');
  });

  describe('Rename a single type', () => {
    // Given the "Homepage" single type is open
    // When the user edits the type, changes the Display name to "New name", and saves
    // Then after restart the heading is updated to "New name"
    test.todo('AC6.1 — the user edits the type, changes the Display name to "New name", and…');
  });

  describe('Delete a single type', () => {
    // Given the "Homepage" single type is open
    // When the user edits the type, clicks "Delete" (accepting the browser confirmation dialog), and saves
    // Then the single type is removed
    test.todo('AC7.1 — the user edits the type, clicks "Delete" (accepting the browser confi…');
  });

  describe('Localization, per-field localization, and uniqueness on a field', () => {
    // Given the "Homepage" single type is open
    // When the user creates a text field "localizedField" and saves
    // Then after restart the heading is visible
    test.todo('AC8.1 — the user creates a text field "localizedField" and saves');

    // Given the "localizedField" field exists
    // When the user disables localization on that field via Advanced settings ("Enable localization for this field") and saves
    // Then after restart the heading is visible
    test.todo('AC8.2 — the user disables localization on that field via Advanced settings ("…');

    // Given the "localizedField" field exists
    // When the user enables uniqueness on the same field via Advanced settings ("Unique field") and saves
    // Then after restart the heading is visible
    test.todo('AC8.3 — the user enables uniqueness on the same field via Advanced settings (…');
  });
});
