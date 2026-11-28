import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures';

// Before this file, the database holds the previous file's data, or the worker's probe (written
// after the snapshot) when this file is the first one the worker runs (single file, --grep,
// shard). Both have the probe: in the default order the previous file is reset-file-scope-1,
// whose `beforeAll` writes it. Only a restore before this file removes it.

test('a new file starts on the snapshot, without the previous file data', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});
