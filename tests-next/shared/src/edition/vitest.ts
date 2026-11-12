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
 * A block that needs an EE feature: skipped in CE runs; in EE runs it fails if the instance
 * doesn't have the feature. `server` is a getter, since the server starts in a `beforeAll`.
 */
export const describeIfFeature = (
  feature: string,
  server: () => Server,
  name: string,
  fn: () => void
) =>
  describeEE(`${name} (${feature})`, () => {
    beforeAll(async () => {
      requireFeatures(await getInstanceFeatures(server()), { ee: [feature] });
    });
    fn();
  });
