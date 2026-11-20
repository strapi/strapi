import { expect, test } from '../../fixtures/app';
import { writeProbe } from './probe';

// Default `file` scope: the tests of a file share their data. The files run in name order on
// the single worker, so reset-file-scope-2 runs right after this one.

test('the first test of a file starts on the snapshot', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test('the next test of the same file keeps its data', async ({ server }) => {
  expect(await writeProbe(server)).toBe(false);
});
