import { expect, test, type Seeded } from '../../fixtures';

import { endUser, findUsers } from './users';

// Default `file` scope: what a file's `beforeAll` seeds stays for every test of that file, and
// is gone in the next one (seed-file-scope-2 runs right after this file on the single worker).

const FILE_1_EMAIL = 'seeded-in-file-1@example.com';

const plan = {
  users: [endUser(FILE_1_EMAIL)],
  apiTokens: [{ name: 'reader', type: 'full-access' as const }],
};

let seeded: Seeded<typeof plan>;

test.beforeAll(async ({ seed }) => {
  seeded = await seed(plan);
});

test('a test sees what beforeAll seeded, with the ids seed returned', async ({ server }) => {
  const [user] = seeded.users;
  const [token] = seeded.apiTokens;

  expect(await findUsers(server, token.accessKey, FILE_1_EMAIL)).toEqual([user.id]);
});

test('the next test of the file sees it too', async ({ server }) => {
  expect(await findUsers(server, seeded.apiTokens[0].accessKey, FILE_1_EMAIL)).toEqual([
    seeded.users[0].id,
  ]);
});

test('the result type has the steps of the plan only', () => {
  // @ts-expect-error the plan has no locales step, so reading `locales` doesn't compile
  expect(seeded.locales).toEqual([]);
});
