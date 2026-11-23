import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// Default `file` scope: the tests of a file share what its `beforeAll` wrote. They don't share
// data between tests: each one must pass alone (--grep, shard), and a failed test restarts the
// worker on a fresh snapshot.
//
// Before this file, the database holds the previous file's data, or the worker's probe (written
// after the snapshot) when this file is the first one the worker runs. In the default order the
// previous file is app/lifecycle, which writes no probe, but its own restore removed the worker's.
// Either way the probe is only missing when a restore ran since the worker started.

test.beforeAll(async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test('a test of a file sees what its beforeAll wrote', async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});

test('every test of the file sees it, also when it runs alone', async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});
