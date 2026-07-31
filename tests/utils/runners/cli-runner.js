'use strict';

const path = require('path');
const execa = require('execa');
const { runnerTimeoutMs } = require('../cli-transfer-remote-e2e/timeouts');

/**
 * Load domain-specific configuration
 */
const loadDomainConfigs = async (testsDir, domains, argv) => {
  const fs = require('node:fs/promises');
  const loadDomainConfig = async (domain) => {
    try {
      const configPath = path.join(testsDir, domain, 'config.js');
      await fs.access(configPath);
      // Import config.js and call it as a function
      const config = require(configPath);
      if (typeof config === 'function') {
        return await config(argv);
      }
      return config;
    } catch (e) {
      // use default config
      return {
        testApps: 1,
      };
    }
  };

  // Load the domain configs into an object with keys of the name of the test domain
  const domainConfigs = {};
  await Promise.all(
    domains.map(async (domain) => {
      domainConfigs[domain] = await loadDomainConfig(domain);
    })
  );

  return domainConfigs;
};

/**
 * Calculate the number of test apps required based on domain configs
 */
const calculateTestAppsRequired = (domainConfigs, concurrency) => {
  // Determine the number of simultaneous test apps we need by taking the concurrency number of highest testApps requested from config
  return Object.entries(domainConfigs)
    .map(([, value]) => value.testApps) // Extract testApps values from config
    .sort((a, b) => b - a) // Sort in descending order
    .slice(0, concurrency) // Take the top X values
    .reduce((acc, value) => acc + value, 0); // Sum up the values
};

/**
 * The test runner parses CLI flags with yargs before invoking Jest. Unknown options (e.g.
 * `--testPathPattern=…`) become plain properties on the parsed object and are omitted from `_`,
 * so they never reached Jest unless the user put them after `--`. Re-serialize those properties
 * as argv fragments for Jest.
 *
 * @param {Record<string, unknown>} testYargs - yargs parse() result for args after `--type`
 * @returns {string[]}
 */
const buildForwardedRunnerArgs = (testYargs) => {
  /** Keys owned by tests/scripts/run-tests.js (not for Jest). */
  const runnerKeys = new Set([
    '_',
    '$0',
    'concurrency',
    'c',
    'domains',
    'd',
    'setup',
    'f',
    'updateSnapshot',
    'u',
  ]);

  const args = [...testYargs._];

  for (const key of Object.keys(testYargs)) {
    if (runnerKeys.has(key) || key.startsWith('$')) {
      continue;
    }
    const value = testYargs[key];
    if (value === undefined || value === false) {
      continue;
    }
    const flag = `--${key}`;
    if (value === true) {
      args.push(flag);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        args.push(flag, String(item));
      }
    } else {
      args.push(`${flag}=${String(value)}`);
    }
  }

  return args;
};

/**
 * Run Jest test command
 * @param {{ domainDir: string, jestConfigPath: string, testApps: string[], testArgs: string[], domain?: string }} opts
 */
const runCLI = async ({ domainDir, jestConfigPath, testApps, testArgs, domain }) => {
  await execa(
    'jest',
    [
      '--config',
      jestConfigPath,
      '--rootDir',
      domainDir,
      '--color',
      '--verbose',
      '--runInBand', // tests must not run concurrently
      ...testArgs,
    ],
    {
      stdio: 'inherit',
      cwd: domainDir, // run from the domain directory
      // Only set what the runner owns; execa merges with process.env by default (extendEnv: true),
      // so e.g. TRANSFER_CLI_MEDIA_* from the shell still reach Jest.
      env: {
        TEST_APPS: testApps.join(','),
        JWT_SECRET: process.env.JWT_SECRET || 'test-jwt-secret',
      },
      // strapi domain includes remote transfer e2e; longer budget than other domains (see cli-transfer-remote-e2e/timeouts.js).
      timeout: runnerTimeoutMs(domain),
    }
  );
};

module.exports = {
  loadDomainConfigs,
  calculateTestAppsRequired,
  buildForwardedRunnerArgs,
  runCLI,
};
