import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

test.use({ resetScope: 'test' });

// The database holds the probe before this file (the previous file or the worker wrote it), and
// `beforeAll` writes it again: each test, even alone (--grep, shard), only gets an empty probe
// when a restore ran right before it.

test.beforeAll(async ({ server }) => {
  // A restore also runs before beforeAll.
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
