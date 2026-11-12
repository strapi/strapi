import { expect, test } from '../../fixtures/app';
import { writeProbe } from './probe';

test('a new file starts on the snapshot, without the previous file data', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});
