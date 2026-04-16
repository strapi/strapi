'use strict';

const chalk = require('chalk');

function hasStrapiLicense() {
  return Boolean(process.env.STRAPI_LICENSE?.trim());
}

/**
 * CE vs EE for e2e: one resolution path for local runs, CI, and Playwright config.
 *
 * **Scripts** (`npm_lifecycle_event`):
 * - `yarn test:e2e:ce` → always CE (`STRAPI_DISABLE_EE=true`, `STRAPI_LICENSE` removed from env).
 * - `yarn test:e2e:ee` → EE; **process exits** if `STRAPI_LICENSE` is missing.
 * - `yarn test:e2e` → auto: EE if a license string is present, else CE (safe).
 *
 * **Explicit `STRAPI_E2E_EDITION`** (CI `run-e2e-tests`, shell, or `.env` when not cleared by
 * `cross-env`): `ce` forces CE; `ee` requires a license (falls back to CE with a warning when
 * running under `test:e2e` without one — only `test:e2e:ee` hard-fails).
 *
 * Mutates `process.env`: sets `STRAPI_E2E_EDITION`; sets or clears `STRAPI_DISABLE_EE` for Strapi
 * (`packages/core/core/src/ee/index.ts` treats only `'true'` as force-CE); clears `STRAPI_LICENSE`
 * when edition is CE so child processes cannot boot as EE.
 */
function resolveE2eEdition() {
  const lifecycle = process.env.npm_lifecycle_event;

  if (lifecycle === 'test:e2e:ce') {
    return 'ce';
  }

  if (lifecycle === 'test:e2e:ee') {
    return 'ee';
  }

  const explicit = process.env.STRAPI_E2E_EDITION?.trim().toLowerCase();
  if (explicit === 'ce') {
    return 'ce';
  }
  if (explicit === 'ee') {
    if (!hasStrapiLicense()) {
      return 'ce';
    }
    return 'ee';
  }

  return hasStrapiLicense() ? 'ee' : 'ce';
}

function applyE2eEditionEnv() {
  const lifecycle = process.env.npm_lifecycle_event;
  const explicitBefore = process.env.STRAPI_E2E_EDITION?.trim().toLowerCase();

  if (lifecycle === 'test:e2e:ee' && !hasStrapiLicense()) {
    console.error(
      chalk.red.bold('[e2e]'),
      chalk.red(
        'yarn test:e2e:ee requires STRAPI_LICENSE (e.g. in tests/e2e/.env or export STRAPI_LICENSE=…).'
      )
    );
    process.exit(1);
  }

  const edition = resolveE2eEdition();

  if (edition === 'ce' && explicitBefore === 'ee' && !hasStrapiLicense()) {
    console.warn(
      chalk.yellow('[e2e]'),
      chalk.yellow(
        'STRAPI_E2E_EDITION=ee was set but STRAPI_LICENSE is missing — running Community Edition.'
      )
    );
  }

  process.env.STRAPI_E2E_EDITION = edition;

  if (edition === 'ce') {
    process.env.STRAPI_DISABLE_EE = 'true';
    delete process.env.STRAPI_LICENSE;
  } else {
    delete process.env.STRAPI_DISABLE_EE;
  }

  return edition;
}

module.exports = { resolveE2eEdition, applyE2eEditionEnv, hasStrapiLicense };
