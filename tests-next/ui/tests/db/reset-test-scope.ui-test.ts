import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures';

test.use({ resetScope: 'test' });

// Before this file, the database holds the previous file's data, or the worker's probe (written
// after the snapshot) when this file is the first one the worker runs (single file, --grep,
// shard). Both have the probe: in the default order the previous file is reset-file-scope-3,
// whose `beforeAll` writes it. `beforeAll` writes it again, so each test, even alone, only gets
// an empty probe when a restore ran right before it.

test.beforeAll(async ({ server }) => {
  // The file reset ran before it. The nested describe below checks the test-scope reset before a
  // hook, which this one can't tell apart.
  expect(await writeProbe(server)).toBe(true);
});

// No restore before afterAll: it sees what the last test wrote.
test.afterAll(async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});

test('with test scope, a test starts on the snapshot', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test('with test scope, the next test starts on the snapshot too', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test.describe('a nested describe', () => {
  let createdInBeforeAll: boolean | undefined;

  // Runs after the file's `beforeAll` (and, in a full run, after the tests above), which leave
  // the probe in the database. Same file, so only the test-scope reset can remove it.
  test.beforeAll(async ({ server }) => {
    createdInBeforeAll = await writeProbe(server);
  });

  test('with test scope, a restore also runs before a beforeAll hook', async ({ server }) => {
    expect(createdInBeforeAll).toBe(true);
    // And before the test: what beforeAll wrote is gone.
    expect(await writeProbe(server)).toBe(true);
  });
});
