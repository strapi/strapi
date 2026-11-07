import * as shared from '@strapi/tests-shared';

// Proves the runner finds `*.api-test.ts` files and resolves the shared workspace.
// Remove it once the first migrated area lands.
test('the api suite runs', () => {
  expect(shared).toBeDefined();
});
