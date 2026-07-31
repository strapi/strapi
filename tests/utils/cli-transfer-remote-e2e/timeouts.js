'use strict';

/**
 * Jest / execa timeouts for remote transfer CLI e2e (scale with TRANSFER_CLI_MEDIA_*).
 * Override: CLI_TRANSFER_REMOTE_*_TIMEOUT_MS (legacy CLI_TRANSFER_PULL_* for runner/jest).
 */

const parseNonNegativeInt = (value, fallback) => {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const totalSeededMediaBytes = () => {
  const bytes = parseNonNegativeInt(process.env.TRANSFER_CLI_MEDIA_BYTES, 2048);
  const count = parseNonNegativeInt(process.env.TRANSFER_CLI_MEDIA_COUNT, 2);
  return bytes * count;
};

const STRAPI_DOMAIN_DEFAULT_RUNNER_MS = 30 * 60 * 1000;

/**
 * Outer execa(Jest) budget. Non-strapi CLI domains stay at 2 minutes.
 * @param {string} [domainName]
 */
function runnerTimeoutMs(domainName) {
  const explicit =
    process.env.CLI_TRANSFER_REMOTE_RUNNER_TIMEOUT_MS ||
    process.env.CLI_TRANSFER_PULL_RUNNER_TIMEOUT_MS;
  if (explicit) {
    return parseNonNegativeInt(explicit, STRAPI_DOMAIN_DEFAULT_RUNNER_MS);
  }

  if (domainName !== 'strapi') {
    return 2 * 60 * 1000;
  }

  const total = totalSeededMediaBytes();
  if (total > 100 * 1024 * 1024) {
    return 4 * 60 * 60 * 1000;
  }
  if (total > 10 * 1024 * 1024) {
    return 90 * 60 * 1000;
  }
  return STRAPI_DOMAIN_DEFAULT_RUNNER_MS;
}

function jestSuiteTimeoutMs() {
  const explicit =
    process.env.CLI_TRANSFER_REMOTE_JEST_TIMEOUT_MS ||
    process.env.CLI_TRANSFER_PULL_JEST_TIMEOUT_MS;
  if (explicit) {
    return parseNonNegativeInt(explicit, 10 * 60 * 1000);
  }
  const total = totalSeededMediaBytes();
  if (total > 100 * 1024 * 1024) {
    return 4 * 60 * 60 * 1000;
  }
  if (total > 10 * 1024 * 1024) {
    return 90 * 60 * 1000;
  }
  return 10 * 60 * 1000;
}

module.exports = {
  totalSeededMediaBytes,
  runnerTimeoutMs,
  jestSuiteTimeoutMs,
};
