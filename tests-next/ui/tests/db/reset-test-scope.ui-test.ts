import { expect, test } from '../../fixtures/app';
import { writeProbe } from './probe';

test.use({ resetScope: 'test' });

test('with test scope, a test starts on the snapshot', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});

test('with test scope, the next test starts on the snapshot too', async ({ server }) => {
  expect(await writeProbe(server)).toBe(true);
});
