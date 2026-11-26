import type { TestInfo } from '@playwright/test';
import { seed as seedServer, type SeedPlan, type SeedResult } from '@strapi/tests-shared';

import { currentHookType, test as appTest, type ResetScope } from './app';

/**
 * What `seed(plan)` returns: the steps of the plan, each with what it created (ids, documentIds,
 * access keys), in the order of the plan. A step the plan doesn't have isn't there, so reading it
 * is a type error.
 */
export type Seeded<P extends SeedPlan> = Pick<SeedResult, Extract<keyof P, keyof SeedResult>>;

export interface SeedOptions {
  /**
   * Data the tests of a file (or a `describe`) need, for example
   * `test.use({ seedPlan: { adminRoles: [{ name: 'Reviewer' }] } })`. Read it with the `seeded`
   * fixture. Default: nothing.
   */
  seedPlan: SeedPlan;
}

export interface SeedFixtures {
  /**
   * Seeds the running server (POST /api/tests/seed) and returns what it created. The data lives
   * until the next reset (`resetScope`): with `file` scope, data a `beforeAll` seeds stays for
   * the tests of that file only.
   */
  seed: <P extends SeedPlan>(plan: P) => Promise<Seeded<P>>;
  /**
   * What `seedPlan` created. Seeded on first use after each reset, and reused until the next:
   * once per file with `file` scope, once per test with `test` scope.
   */
  seeded: SeedResult;
}

export interface SeedWorkerFixtures {
  /**
   * A name no other call returns in this worker, for data whose name or email must be unique
   * when several tests of a file create it: `` `${unique('editor')}@example.com` ``. Each worker
   * has its own database, so names only need to be unique in a worker.
   */
  unique: (label: string) => string;
  /** What `seeded` created, until the next restore. */
  seededCache: { file?: string; restores: number; results: Map<string, SeedResult> };
}

/** Data a `beforeAll` seeds with `test` scope is gone before the first test: fail early. */
const assertSurvivesReset = (resetScope: ResetScope, testInfo: TestInfo, fixture: string) => {
  if (resetScope === 'test' && currentHookType(testInfo) === 'beforeAll') {
    throw new Error(
      `"${fixture}" in beforeAll with resetScope 'test': the reset before each test wipes the data. Seed in beforeEach or in the test, or use resetScope 'file'.`
    );
  }
};

const EMPTY_RESULT: SeedResult = {
  locales: [],
  adminRoles: [],
  adminUsers: [],
  users: [],
  media: [],
  entries: [],
  apiTokens: [],
};

export const test = appTest.extend<SeedOptions & SeedFixtures, SeedWorkerFixtures>({
  seedPlan: [{}, { option: true }],

  unique: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      let count = 0;
      await use((label) => {
        count += 1;
        return `${label}-${count}`;
      });
    },
    { scope: 'worker' },
  ],

  seededCache: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      await use({ restores: 0, results: new Map() });
    },
    { scope: 'worker' },
  ],

  // `databaseReset` is automatic, so Playwright sets it up first: the reset never wipes a seed.
  async seed({ server, resetScope }, use, testInfo) {
    await use(async (plan) => {
      assertSurvivesReset(resetScope, testInfo, 'seed');
      return seedServer(server, plan);
    });
  },

  async seeded({ seed, seedPlan, resetScope, databaseOwner, seededCache }, use, testInfo) {
    assertSurvivesReset(resetScope, testInfo, 'seeded');

    // A restore (or a new file) since the last seed means the cached data is gone.
    if (seededCache.file !== testInfo.file || seededCache.restores !== databaseOwner.restores) {
      seededCache.file = testInfo.file;
      seededCache.restores = databaseOwner.restores;
      seededCache.results.clear();
    }

    const key = JSON.stringify(seedPlan);
    let result = seededCache.results.get(key);
    if (!result) {
      result = Object.keys(seedPlan).length > 0 ? await seed(seedPlan) : EMPTY_RESULT;
      seededCache.results.set(key, result);
    }

    await use(result);
  },
});
