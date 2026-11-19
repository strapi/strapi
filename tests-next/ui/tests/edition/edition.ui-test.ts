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

  const MISSING_FLAG = 'This test needs future flag "notAFlag"';

  // Declared as expected to fail: the requirements check throws before the body runs. test.fail
  // accepts any failure, so this hook checks why it failed:
  // - passed: test.fail already reports it, nothing to do here;
  // - skipped: expected status becomes `skipped`, so failing the hook turns the test red;
  // - failed for another reason (an unrelated throw in `requirementsCheck`, `features` or
  //   `server`): failing the hook would only add a failure test.fail accepts, so the hook makes
  //   the failure unexpected instead.
  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    expect(testInfo.status).not.toBe('skipped');
    if (testInfo.status === 'failed' && !testInfo.error?.message?.includes(MISSING_FLAG)) {
      testInfo.expectedStatus = 'passed';
    }
  });

  test.fail('fails instead of skipping', async () => {});
});
