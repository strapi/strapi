import { editionFromEnv } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// The edition contract in the ui suite (RFC D6). Runs in both editions.
test('the instance runs in the edition of the run', { tag: '@smoke' }, async ({ features }) => {
  expect(features.edition).toBe(editionFromEnv());
});

// CE runs leave out `@ee` tests (see playwright.config.ts): this one would fail on CE.
test('an @ee test only runs in EE runs', { tag: '@ee' }, async ({ features }) => {
  expect(features.edition).toBe('ee');
});

test.describe('a test that needs a flag the instance does not have', () => {
  test.use({ requires: { future: ['notAFlag'] } });

  // Declared as expected to fail: the requirements check throws before the body runs. If the
  // check skipped instead, or let the test pass, this test would fail.
  test.fail('fails instead of skipping', async () => {});
});
