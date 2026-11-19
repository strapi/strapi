import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// The database holds the probe before this file: reset-file-scope-2 wrote it, or, when this file
// runs alone, the worker did after the snapshot. The file reset must run before this
// `beforeAll`, not between it and the first test.

let createdInBeforeAll: boolean | undefined;

test.beforeAll(async ({ server }) => {
  createdInBeforeAll = await writeProbe(server);
});

test('a file reset runs before beforeAll and keeps what it wrote', async ({ server }) => {
  // The probe was gone when beforeAll ran.
  expect(createdInBeforeAll).toBe(true);
  // What beforeAll wrote is still there.
  expect(await writeProbe(server)).toBe(false);
});
