import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

// The database holds the probe before this file: reset-file-scope-1 wrote it, or, when this file
// runs alone, the worker did after the snapshot. Only a restore before the file removes it.

test('a new file starts on the snapshot, without the previous file data', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});
