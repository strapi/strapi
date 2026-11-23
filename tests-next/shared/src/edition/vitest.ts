import { beforeAll, describe } from 'vitest';

import type { Server } from '../app/server';
import { editionFromEnv, getInstanceFeatures, requireFeatures } from './index';

/**
 * Vitest helpers of the edition contract, for the api and cli suites. Imported from
 * `@strapi/tests-shared/vitest`, so the Playwright suite doesn't load Vitest.
 */

/** A block that only runs in EE runs (STRAPI_TEST_EDITION=ee). CE runs skip it. */
export const describeEE = (name: string, fn: () => void) =>
  describe.skipIf(editionFromEnv() !== 'ee')(`${name} [EE]`, fn);

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
