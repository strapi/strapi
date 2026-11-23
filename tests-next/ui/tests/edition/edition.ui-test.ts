import { editionFromEnv } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// The edition contract in the ui suite (RFC D6). Runs in both editions.
test('the instance runs in the edition of the run', { tag: '@smoke' }, async ({ features }) => {
  expect(features.edition).toBe(editionFromEnv());
});

// CE runs leave out `@ee` tests (see playwright.config.ts): this one would fail on CE.
test('an EE-tagged test only runs in EE runs', { tag: '@ee' }, async ({ features }) => {
  expect(features.edition).toBe('ee');
});

test.describe('a test that needs a flag the instance does not have', () => {
  test.use({ requires: { future: ['notAFlag'] } });

  // Declared as expected to fail: the requirements check throws before the body runs. If the
  // check let the test pass, test.fail would fail. A skip is reported as skipped, not failed,
  // so the afterEach fails on a skip. It only rejects a skip: failing a passed test here would
  // turn it into the failure test.fail expects.
  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    expect(testInfo.status).not.toBe('skipped');
  });

  test.fail('fails instead of skipping', async () => {});
});
