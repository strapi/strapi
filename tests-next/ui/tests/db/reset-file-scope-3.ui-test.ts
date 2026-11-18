import { expect, test } from '../../fixtures/app';
import { writeProbe } from './probe';

// Runs after reset-file-scope-2, which leaves the probe in the database. The file reset must
// run before this `beforeAll`, not between it and the first test.

let createdInBeforeAll: boolean | undefined;

test.beforeAll(async ({ server }) => {
  createdInBeforeAll = await writeProbe(server);
});

test('a file reset runs before beforeAll and keeps what it wrote', async ({ server }) => {
  // The previous file's probe was gone when beforeAll ran.
  expect(createdInBeforeAll).toBe(true);
  // What beforeAll wrote is still there.
  expect(await writeProbe(server)).toBe(false);
});
