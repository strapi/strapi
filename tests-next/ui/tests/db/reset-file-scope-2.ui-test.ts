import { writeProbe } from '@strapi/tests-shared';

import { expect, test } from '../../fixtures/app';

test('a new file starts on the snapshot, without the previous file data', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});
