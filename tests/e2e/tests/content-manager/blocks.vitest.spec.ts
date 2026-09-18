import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/blocks.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Blocks Editor', () => {
  describe('Add a code block and choose its language', () => {
    // Given I am in the Content Manager
    // When I open the Homepage single type
    // Then I see its blocks editor textbox
    test.todo('AC1.1 — I open the Homepage single type');

    // Given the blocks editor textbox
    // When I click into it and type text (e.g. `const problems = 99`)
    // Then that text is rendered
    test.todo('AC1.2 — I click into it and type text (e.g. `const problems = 99`)');

    // Given text in the current block
    // When I use the blocks toolbar combobox to convert it into a "Code block"
    // Then the block becomes a code block
    test.todo('AC1.3 — I use the blocks toolbar combobox to convert it into a "Code block"');

    // Given the block is now a code block with the language selector initially showing "Plain text"
    // When I open the language selector and choose a language (e.g. "Fortran")
    // Then the selected language is shown
    test.todo('AC1.4 — I open the language selector and choose a language (e.g. "Fortran")');

    // Given the code block
    // When I press Enter twice from outside the code block
    // Then a new block is created
    test.todo('AC1.5 — I press Enter twice from outside the code block');

    // Given my changes
    // When I click "Save"
    // Then the save request to the Homepage single type completes successfully
    test.todo('AC1.6 — I click "Save"');

    // Given the change has been saved
    // When I reload the page
    // Then the code text is still present in the blocks editor
    test.todo('AC1.7 — I reload the page');

    // Given the reloaded page
    // When I click back into the saved code surface
    // Then the blocks toolbar language combobox is still set to the chosen language ("Fortran")
    test.todo('AC1.8 — I click back into the saved code surface');
  });
});
