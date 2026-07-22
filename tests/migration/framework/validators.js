'use strict';

const path = require('path');
const execa = require('execa');

/**
 * @param {Record<string, string>} baseEnv
 * @param {{ multiplier: number, dbEnv: object, validatorProfile: string, dataOrigin?: string }} extra
 */
function buildValidateEnv(ctx, { multiplier, dbEnv, validatorProfile, dataOrigin }) {
  return {
    ...process.env,
    ...dbEnv,
    MIGRATION_MULTIPLIER: String(multiplier),
    SEED_MULTIPLIER: String(multiplier),
    MIGRATION_VALIDATOR_PROFILE: validatorProfile,
    ...(dataOrigin ? { MIGRATION_DATA_ORIGIN: dataOrigin } : {}),
  };
}

async function runValidationScript(ctx, validateEnv, multiplier) {
  await execa(
    'node',
    [path.join('scripts', 'validate-migration.js'), '--multiplier', String(multiplier)],
    {
      cwd: ctx.COMPLEX_DIR,
      stdio: 'inherit',
      env: validateEnv,
    }
  );
}

const REGISTRY = {
  /**
   * v4 canonical seed → workspace expectations (default origin v4). Alias for `full-v4-origin`.
   */
  full: async (ctx, opts) => {
    return REGISTRY['full-v4-origin'](ctx, opts);
  },

  'full-v4-origin': async (ctx, { multiplier, dbEnv, dataOrigin = 'v4' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-v4-origin',
        dataOrigin: dataOrigin || 'v4',
      }),
      multiplier
    );
  },

  'full-v5-origin': async (ctx, { multiplier, dbEnv, dataOrigin = 'v5' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-v5-origin',
        dataOrigin: dataOrigin || 'v5',
      }),
      multiplier
    );
  },

  /**
   * Same as full-v4-origin but skips DP join-table source parity (ladder / double discard-drafts).
   * Origin defaults to v4; pass scenario.dataOrigin for mixed cases.
   */
  'full-ladder': async (ctx, { multiplier, dbEnv, dataOrigin = 'v4' }) => {
    await runValidationScript(
      ctx,
      buildValidateEnv(ctx, {
        multiplier,
        dbEnv,
        validatorProfile: 'full-ladder',
        dataOrigin,
      }),
      multiplier
    );
  },
};

/**
 * @param {object} ctx
 * @param {string[]} names
 * @param {{ multiplier: number, dbEnv: object, dataOrigin: string }} opts
 */
async function runValidators(ctx, names, { multiplier, dbEnv, dataOrigin = 'v4' }) {
  const list = Array.isArray(names) ? names : [];
  for (const name of list) {
    const fn = REGISTRY[name];
    if (!fn) {
      throw new Error(
        `Unknown migration validator "${name}". Known: ${Object.keys(REGISTRY).join(', ')}`
      );
    }
    console.log(`\n✅ Validator: ${name}`);
    await fn(ctx, { multiplier, dbEnv, dataOrigin });
  }
}

module.exports = { runValidators, REGISTRY };
