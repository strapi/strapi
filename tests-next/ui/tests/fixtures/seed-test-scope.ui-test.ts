import { expect, test } from '../../fixtures';

import { endUser, findUsers } from './users';

// With `test` scope, every test starts on the snapshot: `seedPlan` is seeded again for each
// test, and what a test seeds itself is gone by the next one.

test.describe('with test scope', () => {
  test.use({
    resetScope: 'test',
    seedPlan: { apiTokens: [{ name: 'reader', type: 'full-access' }] },
  });

  const EMAIL = 'seeded-by-a-test@example.com';

  test('a test seeds on top of seedPlan', async ({ server, seed, seeded }) => {
    const { users } = await seed({ users: [endUser(EMAIL)] });

    expect(await findUsers(server, seeded.apiTokens[0].accessKey, EMAIL)).toEqual([users[0].id]);
  });

  test('the next test gets seedPlan again, without what the previous test seeded', async ({
    server,
    seeded,
  }) => {
    // The token is new: the one of the previous test went with the reset.
    expect(await findUsers(server, seeded.apiTokens[0].accessKey, EMAIL)).toEqual([]);
  });
});

test.describe('seeding in beforeAll with test scope', () => {
  test.use({ resetScope: 'test' });

  let error: unknown;

  // The reset before the first test would wipe what this seeds: `seed` throws instead.
  test.beforeAll(async ({ seed }) => {
    error = await seed({ users: [endUser('wiped@example.com')] }).then(
      () => undefined,
      (thrown: unknown) => thrown
    );
  });

  test('seed throws instead of seeding data no test would see', () => {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("in beforeAll with resetScope 'test'");
  });
});
