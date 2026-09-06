import { TestEnvironment } from 'jest-environment-jsdom';

import { applyNodeGlobals } from './patches/node-globals';
import { patchResponseJsonRealm } from './patches/response-json-realm';
import { patchRequestBodyStash } from './patches/request-body-stash';
import type { Global, Teardown } from './patches/types';

// Derive the constructor types from `TestEnvironment` itself rather than
// importing `@jest/environment` directly
type EnvConfig = ConstructorParameters<typeof TestEnvironment>[0];
type EnvContext = ConstructorParameters<typeof TestEnvironment>[1];

/* -------------------------------------------------------------------------------------------------
 * CustomJSDOMEnvironment
 *
 * Thin orchestrator over three independently-deletable patches that make
 * jsdom+msw-v2 work:
 *
 *   1. `applyNodeGlobals`       — re-bind Node's fetch/Request/Response/
 *                                 streams onto jsdom's global so MSW v2's
 *                                 `@mswjs/interceptors` can install.
 *   2. `patchResponseJsonRealm` — make Response bodies parse into jsdom-
 *                                 realm objects (so `instanceof Array` /
 *                                 `toStrictEqual` behave).
 *   3. `patchRequestBodyStash`  — work around undici's
 *                                 `Request.clone() locks original stream`
 *                                 behaviour that msw triggers on every
 *                                 handler dispatch.
 *
 * Each patch owns its own state, its own sanity checks, and its own teardown.
 * The orchestrator keeps the teardown stack in setup order and pops in
 * reverse. A future msw / undici / jest-environment-jsdom release that fixes
 * any of these concerns upstream should let the corresponding patch be
 * deleted in a single commit, without touching the orchestrator or the other
 * patches.
 *
 * Opt-out
 * -------
 * The MSW-specific patches (2 and 3) add cost that non-msw test suites do
 * not benefit from. Disable them via `testEnvironmentOptions.strapi.msw =
 * false` in a jest config. `applyNodeGlobals` is always applied — it is
 * cheap, and some Strapi app code touches fetch/Request directly.
 *
 *   // jest.config.js for a workspace that does NOT use msw
 *   module.exports = {
 *     testEnvironment: '@strapi/admin-test-utils/environment',
 *     testEnvironmentOptions: { strapi: { msw: false } },
 *   };
 *
 * See `jest-preset.front.js` for the other half of the msw/node resolution
 * (`testEnvironmentOptions.customExportConditions: ['']`) — both halves are
 * required for `msw/node` to resolve under jsdom.
 * -----------------------------------------------------------------------------------------------*/

interface StrapiEnvOptions {
  /**
   * Whether to install the msw-v2-specific Response/Request prototype patches.
   * Defaults to `true`. Set to `false` for test suites that never import msw.
   */
  msw?: boolean;
  /**
   * IANA timezone for this test file's realm (e.g. `America/Los_Angeles`).
   *
   * The global setup pins `TZ=UTC`, and V8 freezes a realm's Date/Intl
   * timezone when the jsdom window is created — mutating `process.env.TZ`
   * inside a test has no effect. This option sets `TZ` BEFORE the realm is
   * built, which is the only way to run a test file in a non-UTC zone
   * (timezone regressions are invisible in UTC). Opt in per file:
   *
   *   / **
   *    * @jest-environment @strapi/admin-test-utils/environment
   *    * @jest-environment-options {"strapi": {"tz": "America/Los_Angeles"}}
   *    * /
   *
   * The previous `TZ` is restored on teardown so sibling files in the same
   * worker keep the UTC pin.
   */
  tz?: string;
}

// https://github.com/facebook/jest/blob/v29.4.3/website/versioned_docs/version-29.4/Configuration.md#testenvironment-string
export default class CustomJSDOMEnvironment extends TestEnvironment {
  private readonly strapiOptions: StrapiEnvOptions;

  private teardowns: Teardown[] = [];

  private readonly previousTZ: string | undefined;

  constructor(config: EnvConfig, context: EnvContext) {
    // `testEnvironmentOptions` is not exposed on the parent class's public
    // surface, so grab it from the jest config handed to the constructor.
    const raw = config.projectConfig.testEnvironmentOptions as {
      strapi?: StrapiEnvOptions;
    };
    const strapiOptions = raw.strapi ?? {};

    // Must happen before super(): the parent constructor creates the jsdom
    // window, and V8 freezes the realm's Date/Intl timezone at that point.
    const previousTZ = process.env.TZ;
    if (strapiOptions.tz) {
      process.env.TZ = strapiOptions.tz;
    }

    super(config, context);

    this.strapiOptions = strapiOptions;
    this.previousTZ = previousTZ;
  }

  async setup(): Promise<void> {
    await super.setup();

    const global = this.global as unknown as Global;
    const mswPatchesEnabled = this.strapiOptions.msw !== false;

    this.teardowns.push(applyNodeGlobals(global));
    if (mswPatchesEnabled) {
      this.teardowns.push(patchResponseJsonRealm(global));
      this.teardowns.push(patchRequestBodyStash(global));
    }
  }

  async teardown(): Promise<void> {
    while (this.teardowns.length > 0) {
      const fn = this.teardowns.pop();
      if (fn) {
        fn();
      }
    }
    if (this.strapiOptions.tz) {
      process.env.TZ = this.previousTZ;
    }
    await super.teardown();
  }
}
