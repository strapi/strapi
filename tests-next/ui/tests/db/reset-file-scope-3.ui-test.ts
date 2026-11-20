import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// Before this file, the database holds the previous file's data, or the worker's probe (written
// after the snapshot) when this file is the first one the worker runs (single file, --grep,
// shard). Both have the probe: in the default order the previous file is reset-file-scope-2,
// whose test writes it. The file reset must run before this `beforeAll`, not between it and the
// first test.

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
