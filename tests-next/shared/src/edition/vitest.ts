import { beforeAll, describe, type RunnerTask } from 'vitest';

import type { Server } from '../app/server';
import { editionFromEnv, getInstanceFeatures, requireFeatures } from './index';

/**
 * Vitest helpers of the edition contract, for the api and cli suites. Imported from
 * `@strapi/tests-shared/vitest`, so the Playwright suite doesn't load Vitest.
 */

declare module 'vitest' {
  interface TaskMeta {
    /** Set by `describeEE` on its block, and so on its tests, when the run is CE. */
    skippedForEdition?: boolean;
  }
}

/** A block that only runs in EE runs (STRAPI_TEST_EDITION=ee). CE runs skip it. */
export const describeEE = (name: string, fn: () => void) => {
  const skip = editionFromEnv() !== 'ee';
  describe.skipIf(skip)(`${name} [EE]`, { meta: { skippedForEdition: skip } }, fn);
};

/**
 * True when the run left out a test of this file for another reason than its edition: a `-t`, a
 * `.only` or a line filter. A filter can leave the EE blocks out, so a check that they ran
 * doesn't hold. Pass the suite an `afterAll` receives. A `test.skip` also counts as a filter.
 */
export const isFilteredRun = (task: Readonly<RunnerTask>): boolean => {
  const filtered = (t: Readonly<RunnerTask>): boolean =>
    t.type === 'suite' ? t.tasks.some(filtered) : t.mode === 'skip' && !t.meta.skippedForEdition;
  return filtered(task.file);
};

/**
 * The check `describeIfFeature` runs before its tests: fails when the instance doesn't have the
 * EE feature, or when there is no server yet.
 */
export const requireServerFeature = async (server: Server | undefined, feature: string) => {
  if (!server) {
    throw new Error(
      `describeIfFeature("${feature}") has no server to check: start it in an outer beforeAll, outside the block. Vitest runs the check before a beforeAll declared inside the block.`
    );
  }
  requireFeatures(await getInstanceFeatures(server), { ee: [feature] });
};

/**
 * A block that needs an EE feature: skipped in CE runs; in EE runs it fails if the instance
 * doesn't have the feature. `server` is a getter, since the server starts in a `beforeAll`:
 * start it in an outer `beforeAll`, outside the block. Vitest runs the check before a
 * `beforeAll` declared inside the block, so the server would not be there yet.
 */
export const describeIfFeature = (
  feature: string,
  server: () => Server | undefined,
  name: string,
  fn: () => void
) =>
  describeEE(`${name} (${feature})`, () => {
    beforeAll(async () => {
      await requireServerFeature(server(), feature);
    });
    fn();
  });
