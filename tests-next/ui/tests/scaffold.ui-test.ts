import { expect, test } from '@playwright/test';

import * as shared from '@strapi/tests-shared';

// Proves the runner finds `*.ui-test.ts` files and resolves the shared workspace.
// Remove it once the first migrated domain lands.
test('the ui suite runs', () => {
  expect(shared).toBeDefined();
});
