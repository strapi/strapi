import { describe, test } from 'vitest';

// AUTO-GENERATED from docs/user-stories/content-manager/decimal-field-hint.md by `strapi user-stories:sync-e2e`.
// One test() per acceptance criterion (Given/When/Then). Replace each test.todo with a real
// implementation using the Vitest browser fixture — see the imports below and
// tests/e2e/tests/admin/login.vitest.spec.ts for the canonical shape.
//
// import { createBrowserSession, closeBrowserSession, type BrowserSession } from '../../vitest/browser-fixture';
// import { expect } from '../../vitest/expect';

describe('Decimal Field Hint', () => {
  describe('See min/max hints for a decimal field', () => {
    // Given I am a content manager in the Content-Type Builder
    // When I add a decimal number field ("GDP") to the Country content type with advanced minimum 0 and maximum 100
    // Then the field is added
    test.todo('AC1.1 — I add a decimal number field ("GDP") to the Country content type with…');

    // Given the GDP field has been added
    // When I create a new Country entry in the Content Manager
    // Then the GDP field shows the hint "min. 0 / max. 100"
    test.todo('AC1.2 — I create a new Country entry in the Content Manager');

    // Given the test has completed
    // When cleanup runs
    // Then the added GDP attribute can be removed afterwards
    test.todo('AC1.3 — cleanup runs');
  });
});
