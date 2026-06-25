'use strict';

const { isLatestV4Alias } = require('./resolve-strapi-version');

/**
 * Build an in-memory scenario from CLI flags (same shape as JSON scenarios).
 */

function slugVersion(v) {
  return String(v).replace(/\./g, '-');
}

function initialMajor(version) {
  if (isLatestV4Alias(version)) {
    return 4;
  }
  const m = Number(String(version).split('.')[0]);
  return Number.isFinite(m) ? m : NaN;
}

/**
 * @param {{ initial: string, via: string[], validators?: string | null }} argv
 */
function buildScenarioFromFlags(argv) {
  const initial = String(argv.initial || '').trim();
  if (!initial) {
    throw new Error('buildScenarioFromFlags: initial version is required');
  }
  const major = initialMajor(initial);
  if (major !== 4 && major !== 5) {
    throw new Error(
      `--initial must be Strapi 4.x (v4 scaffold), 5.x (pinned app + seed-v5), or \`legacy\` (latest v4 from npm). Got "${initial}".`
    );
  }

  const via = Array.isArray(argv.via) ? argv.via : [];
  const id = `cli-${slugVersion(initial)}${via.length ? `-via-${via.map(slugVersion).join('-')}` : ''}-workspace`;

  const stages = via.map((version) => ({
    id: `pinned-${version}`,
    type: 'strapi-pinned',
    version,
  }));

  const defaultValidators = pickDefaultValidators(major, via);
  const validate = parseValidatorsArg(argv.validators, defaultValidators);
  const dataOrigin = major === 5 ? 'v5' : 'v4';

  stages.push({
    id: 'workspace',
    type: 'workspace',
    validate,
  });

  if (major === 4) {
    return {
      id,
      description: 'Built from CLI flags',
      dataOrigin: 'v4',
      baseline: {
        type: 'v4-scaffold',
        initialVersion: initial,
      },
      stages,
    };
  }

  return {
    id,
    description: 'Built from CLI flags',
    dataOrigin,
    baseline: {
      type: 'v5-pinned',
      initialVersion: initial,
    },
    stages,
  };
}

/** @param {number} initialMajor @param {string[]} via */
function pickDefaultValidators(initialMajor, via) {
  if (via.length > 0) {
    return ['full-ladder'];
  }
  if (initialMajor === 5) {
    return ['full-v5-origin'];
  }
  return ['full-v4-origin'];
}

function parseValidatorsArg(raw, defaultValidators) {
  if (raw == null || String(raw).trim() === '') {
    return defaultValidators;
  }
  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  buildScenarioFromFlags,
  initialMajor,
  pickDefaultValidators,
};
