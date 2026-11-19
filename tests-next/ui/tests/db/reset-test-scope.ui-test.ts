import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

test.use({ resetScope: 'test' });

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
