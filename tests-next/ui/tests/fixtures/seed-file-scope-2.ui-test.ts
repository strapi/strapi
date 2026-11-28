import { expect, test } from '../../fixtures';

import { endUser, findUsers } from './users';

// Declarative seeding: `seedPlan` is seeded on the first use of `seeded` in the file, and reused
// by the next tests until the next reset.

const EMAIL = 'seeded-in-file-2@example.com';

test.use({
  seedPlan: {
    users: [endUser(EMAIL)],
    apiTokens: [{ name: 'reader', type: 'full-access' }],
  },
});

test('a new file starts without the previous file data', async ({ server, seeded }) => {
  // The address seed-file-scope-1 seeded; inlined so this file doesn't load that one's tests.
  expect(
    await findUsers(server, seeded.apiTokens[0].accessKey, 'seeded-in-file-1@example.com')
  ).toEqual([]);
});

test('seedPlan is seeded once per file', async ({ server, seeded }) => {
  // A second seed would fail on the token name, which is unique, or add a second user.
  expect(await findUsers(server, seeded.apiTokens[0].accessKey, EMAIL)).toEqual([
    seeded.users[0].id,
  ]);
});

test('the next test gets the same seeded data', async ({ server, seeded }) => {
  expect(await findUsers(server, seeded.apiTokens[0].accessKey, EMAIL)).toHaveLength(1);
});

test('unique gives a new name on every call', ({ unique }) => {
  const first = unique('editor');
  const second = unique('editor');

  expect(first).toMatch(/^editor-/);
  expect(second).not.toBe(first);
});
