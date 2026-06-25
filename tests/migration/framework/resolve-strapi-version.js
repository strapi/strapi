'use strict';

const { execSync } = require('child_process');

/** npm dist-tags that mean “latest published Strapi v4” (@strapi/strapi@legacy). */
const LATEST_V4_ALIASES = new Set(['legacy', 'latest-v4']);

function isLatestV4Alias(version) {
  return LATEST_V4_ALIASES.has(String(version).trim().toLowerCase());
}

/**
 * Resolve a Strapi version specifier to a concrete semver for installs and logging.
 * `legacy` / `latest-v4` → `npm view @strapi/strapi@legacy version`.
 *
 * @param {string} version
 */
function resolveStrapiVersion(version) {
  const raw = String(version).trim();
  if (!raw) {
    throw new Error('Strapi version is required');
  }
  if (!isLatestV4Alias(raw)) {
    return raw;
  }
  const resolved = execSync('npm view @strapi/strapi@legacy version', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
  if (!resolved) {
    throw new Error('Failed to resolve @strapi/strapi@legacy from npm');
  }
  if (resolved !== raw) {
    console.log(`Resolved Strapi v4 baseline: ${raw} → ${resolved} (@strapi/strapi@legacy)`);
  }
  return resolved;
}

/**
 * Replace v4 baseline aliases with concrete semver on an in-memory scenario.
 *
 * @param {object} scenario
 */
function materializeScenarioVersions(scenario) {
  if (!scenario?.baseline) {
    return scenario;
  }
  if (scenario.baseline.type === 'v4-scaffold' && scenario.baseline.initialVersion) {
    const requested = scenario.baseline.initialVersion;
    const resolved = resolveStrapiVersion(requested);
    if (resolved !== requested) {
      scenario.baseline.requestedInitialVersion = requested;
    }
    scenario.baseline.initialVersion = resolved;
  }
  return scenario;
}

module.exports = {
  LATEST_V4_ALIASES,
  isLatestV4Alias,
  resolveStrapiVersion,
  materializeScenarioVersions,
};
