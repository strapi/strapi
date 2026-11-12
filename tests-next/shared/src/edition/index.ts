import type { Server } from '../app/server';

/**
 * The edition contract (RFC D6): one module decides whether a run is CE or EE, for every suite.
 *
 * - `STRAPI_TEST_EDITION=ce|ee`, default `ce`. It replaces `RUN_EE`, `STRAPI_E2E_EDITION` and
 *   `STRAPI_DISABLE_EE` in the test env.
 * - EE needs `STRAPI_LICENSE`: without it, or when Strapi rejects it and boots as CE, the run
 *   fails instead of silently testing CE.
 * - Features and future flags are read from the running instance (test plugin), never from env.
 * - A test that needs a feature or flag the instance doesn't have fails instead of skipping.
 */

export type Edition = 'ce' | 'ee';

export const EDITION_ENV_VAR = 'STRAPI_TEST_EDITION';

const hasLicense = (env: NodeJS.ProcessEnv) => Boolean(env.STRAPI_LICENSE?.trim());

/** The edition of this run. Throws on an unknown value, and on `ee` without a license. */
export const editionFromEnv = (env: NodeJS.ProcessEnv = process.env): Edition => {
  const value = (env[EDITION_ENV_VAR] ?? 'ce').trim().toLowerCase();

  if (value !== 'ce' && value !== 'ee') {
    throw new Error(`${EDITION_ENV_VAR} must be "ce" or "ee", got "${value}".`);
  }
  if (value === 'ee' && !hasLicense(env)) {
    throw new Error(
      `${EDITION_ENV_VAR}=ee needs a STRAPI_LICENSE. The suites don't fall back to CE: run with ${EDITION_ENV_VAR}=ce instead.`
    );
  }
  return value;
};

/**
 * The env a test app runs with for an edition. CE turns EE off and drops the license, so a
 * license in the shell can't make a CE run boot as EE.
 */
export const editionEnv = (
  edition: Edition,
  env: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  if (edition === 'ce') {
    return { STRAPI_DISABLE_EE: 'true', STRAPI_LICENSE: '' };
  }
  if (!hasLicense(env)) {
    throw new Error('An EE app needs a STRAPI_LICENSE.');
  }
  return { STRAPI_DISABLE_EE: 'false', STRAPI_LICENSE: env.STRAPI_LICENSE };
};

/** What a running instance has, as the test plugin reports it (GET /api/tests/features). */
export interface InstanceFeatures {
  edition: Edition;
  /** License features (`cms-content-releases`, `cms-byok-ai`…). Empty in CE. */
  ee: string[];
  /** Future flags (`config/features.js` → `future`) that are on. */
  future: string[];
}

export const getInstanceFeatures = async (server: Server): Promise<InstanceFeatures> => {
  const res = await fetch(`${server.url}/api/tests/features`);
  if (!res.ok) {
    throw new Error(
      `GET /api/tests/features failed (${res.status}): the edition contract needs the test plugin.`
    );
  }
  const body = (await res.json()) as {
    future: Record<string, unknown>;
    ee: { isEE: boolean; features: string[] };
  };
  return {
    edition: body.ee.isEE ? 'ee' : 'ce',
    ee: body.ee.features,
    future: Object.entries(body.future)
      .filter(([, value]) => value === true)
      .map(([name]) => name),
  };
};

/**
 * Fail when the instance didn't boot in the expected edition, for example an EE run whose
 * license Strapi rejected (Strapi then logs a warning and runs as CE).
 */
export const assertEdition = (features: InstanceFeatures, expected: Edition) => {
  if (features.edition !== expected) {
    throw new Error(
      expected === 'ee'
        ? 'Strapi booted as CE in an EE run: it rejected STRAPI_LICENSE (invalid or expired). See the server logs.'
        : 'Strapi booted as EE in a CE run.'
    );
  }
};

export interface Requirements {
  /** License features, which also need an EE run. */
  ee?: string[];
  /** Future flags, set with `scaffoldConfig(app, 'features', { future: { … } })`. */
  future?: string[];
}

/** Fail, listing what is missing, when the instance lacks a required feature or flag. */
export const requireFeatures = (features: InstanceFeatures, requirements: Requirements) => {
  const missing = [
    ...(requirements.ee ?? [])
      .filter((name) => !features.ee.includes(name))
      .map((name) => `EE feature "${name}"`),
    ...(requirements.future ?? [])
      .filter((name) => !features.future.includes(name))
      .map((name) => `future flag "${name}"`),
  ];
  if (missing.length > 0) {
    throw new Error(
      `This test needs ${missing.join(', ')}, which the ${features.edition.toUpperCase()} instance doesn't have. Tests fail instead of skipping when a requirement is missing.`
    );
  }
};
