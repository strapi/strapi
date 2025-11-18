'use strict';

const path = require('path');
const execa = require('execa');

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
 * Run Jest test command
 */
const runCLI = async ({ domainDir, jestConfigPath, testApps, testArgs }) => {
  const env = {
    TEST_APPS: testApps.join(','),
    JWT_SECRET: 'test-jwt-secret',
  };

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
      env, // pass it our custom env values
      timeout: 2 * 60 * 1000, // 2 minutes
    }
  );
};

module.exports = {
  loadDomainConfigs,
  calculateTestAppsRequired,
  runCLI,
};
