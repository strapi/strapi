'use strict';

const spec = require('./spec');
const {
  deriveExpectationsForProfile,
  getActiveEntriesForProfile,
} = require('./derive-expectations');
const { resolveProfileConfig } = require('./registry');

/**
 * @param {string[]} argv
 */
function parseMultiplier(argv) {
  const opts = { multiplier: 1 };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--multiplier' && argv[i + 1] != null) {
      opts.multiplier = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg?.startsWith('--multiplier=')) {
      opts.multiplier = Number(arg.split('=')[1]);
      continue;
    }
    if (!Number.isNaN(Number(arg))) {
      opts.multiplier = Number(arg);
    }
  }

  const envMultiplier = process.env.MIGRATION_MULTIPLIER ?? process.env.SEED_MULTIPLIER;
  if (!Number.isNaN(Number(envMultiplier))) {
    opts.multiplier = Number(envMultiplier);
  }

  if (!Number.isFinite(opts.multiplier) || opts.multiplier <= 0) {
    opts.multiplier = 1;
  }

  return opts.multiplier;
}

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} [env]
 */
function resolveProfileName(argv, env = process.env) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--profile' && argv[i + 1] != null) {
      return argv[i + 1];
    }
    if (arg?.startsWith('--profile=')) {
      return arg.split('=')[1];
    }
  }

  if (env.MIGRATION_VALIDATOR_PROFILE) {
    return env.MIGRATION_VALIDATOR_PROFILE;
  }

  if (env.MIGRATION_SKIP_DP_JOIN_PARITY === '1') {
    return 'full-ladder';
  }

  if (env.MIGRATION_DATA_ORIGIN === 'v5') {
    return 'full-v5-origin';
  }

  return 'full-v4-origin';
}

/**
 * @param {string[]} argv
 * @param {NodeJS.ProcessEnv} [env]
 */
function resolveContext(argv, env = process.env) {
  const multiplier = parseMultiplier(argv);
  const profileName = resolveProfileName(argv, env);
  const profileConfig = resolveProfileConfig(profileName);
  const dataOrigin = env.MIGRATION_DATA_ORIGIN === 'v5' ? 'v5' : profileConfig.dataOrigin;
  const skipJoinParity = profileConfig.skipJoinParity || env.MIGRATION_SKIP_DP_JOIN_PARITY === '1';
  const activeEntries = getActiveEntriesForProfile(spec, dataOrigin);
  const expectations = deriveExpectationsForProfile(spec, { profile: dataOrigin, multiplier });

  return {
    multiplier,
    profile: profileName,
    profileConfig,
    dataOrigin,
    flags: { skipJoinParity },
    spec,
    activeEntries,
    expectations,
  };
}

module.exports = {
  parseMultiplier,
  resolveProfileName,
  resolveContext,
};
