import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// Default `file` scope: the tests of a file share what its `beforeAll` wrote. They don't share
// data between tests: each one must pass alone (--grep, shard), and a failed test restarts the
// worker on a fresh snapshot. The database holds the probe before every file (the worker writes
// it after the snapshot), so only a restore makes `beforeAll` create it.

test.beforeAll(async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test('a test of a file sees what its beforeAll wrote', async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});

test('every test of the file sees it, also when it runs alone', async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});
