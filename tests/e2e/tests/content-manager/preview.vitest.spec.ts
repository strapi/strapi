import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/preview.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Preview', () => {
  describe('See and use the preview button for configured content types', () => {
    // Given an Article entry
    // When I open its edit view
    // Then an "Open preview" link is shown
    test.todo('AC1.1 — I open its edit view');

    // Given the edit view with an "Open preview" link
    // When I click "Open preview"
    // Then preview opens in its own page where the draft status and the document heading ("west ham post match") are visible
    test.todo('AC1.2 — I click "Open preview"');

    // Given the preview page
    // When I click "Copy preview link"
    // Then the link is copied
    test.todo('AC1.3 — I click "Copy preview link"');

    // Given the preview page
    // When I click "Close preview"
    // Then I return to the edit view where the title input is visible
    test.todo('AC1.4 — I click "Close preview"');

    // Given unsaved changes (after editing the title)
    // When I view the "Open preview" link
    // Then it is disabled
    test.todo('AC1.5 — I view the "Open preview" link');
  });

  describe('No preview button for unconfigured content types', () => {
    // Given a Product entry (no preview config)
    // When I open its edit view
    // Then no "Open preview" link is shown
    test.todo('AC2.1 — I open its edit view');
  });

  describe('Draft and Published tabs in preview for D&P-enabled content', () => {
    // Given an Article in draft status
    // When I open preview for it
    // Then both a "Draft" tab and a "Published" tab are visible
    test.todo('AC3.1 — I open preview for it');
  });

  describe('Preview iframe loads the correct URL per tab', () => {
    // Given I have published an Article and opened preview
    // When I view the Draft tab
    // Then a "Preview" iframe is present
    test.todo('AC4.1 — I view the Draft tab');

    // Given the preview on the Draft tab
    // When I switch to the "Published" tab
    // Then the iframe `src` updates to match `/preview/api::article.article/.../en/published`
    test.todo('AC4.2 — I switch to the "Published" tab');
  });

  describe('Publish from preview with conditional fields without false validation errors', () => {
    // Given an existing Article
    // When I open preview for it
    // Then an enabled "Publish" button is shown
    test.todo('AC5.1 — I open preview for it');

    // Given the enabled "Publish" button
    // When I click "Publish"
    // Then it succeeds
    test.todo('AC5.2 — I click "Publish"');
  });

  describe('Edit and save as draft, modified, or published from preview (EE)', () => {
    // Given an Article
    // When I open preview for it
    // Then the title field shows the current value
    test.todo('AC6.1 — I open preview for it');

    // Given the preview in draft status
    // When I edit the title and click "Save"
    // Then the document stays in draft status with the new value
    test.todo('AC6.2 — I edit the title and click "Save"');

    // Given the saved draft
    // When I click "Publish"
    // Then a published status is set
    test.todo('AC6.3 — I click "Publish"');

    // Given the published document
    // When I return to the "Draft" tab, edit, and save again
    // Then a "Modified" status is set with the new value
    test.todo('AC6.4 — I return to the "Draft" tab, edit, and save again');

    // Given the modified document
    // When I edit again and switch tabs without saving
    // Then a "Confirmation" alert dialog opens, which can be cancelled
    test.todo('AC6.5 — I edit again and switch tabs without saving');
  });
});
