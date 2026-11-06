import * as shared from '@strapi/tests-shared';

// Proves the runner finds `*.cli-test.ts` files and resolves the shared workspace.
// Remove it once the CLI suite is migrated.
test('the cli suite runs', () => {
  expect(shared).toBeDefined();
});
