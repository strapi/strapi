'use strict';

const path = require('path');
const execa = require('execa');
const fs = require('node:fs/promises');

/**
 * CLI test runner using Jest
 */
class CLIRunner {
  async run({ domains, testAppPaths, concurrency, argv, testRoot, testDomainRoot, cwd }) {
    const loadDomainConfigs = async (domain) => {
      try {
        const configPath = path.join(testDomainRoot, domain, 'config.js');
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
        domainConfigs[domain] = await loadDomainConfigs(domain);
      })
    );

    // Determine the number of simultaneous test apps we need by taking the concurrency number of highest testApps requested from config
    const testAppsRequired = Object.entries(domainConfigs)
      .map(([, value]) => value.testApps) // Extract testApps values from config
      .sort((a, b) => b - a) // Sort in descending order
      .slice(0, concurrency) // Take the top X values
      .reduce((acc, value) => acc + value, 0); // Sum up the values

    if (testAppsRequired === 0) {
      throw new Error('No test apps to spawn');
    }

    // Use the test app paths provided by the shared runner
    const availableTestApps = [...testAppPaths];

    const batches = [];

    for (let i = 0; i < domains.length; i += concurrency) {
      batches.push(domains.slice(i, i + concurrency));
    }

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      let failingTests = 0;
      await Promise.all(
        batch.map(async (domain) => {
          const config = domainConfigs[domain];

          if (availableTestApps.length < config.testApps) {
            console.error('Not enough test apps available; aborting');
            process.exit(1);
          }

          // claim testApps for this domain to use
          const testApps = availableTestApps.splice(-1 * config.testApps);

          /**
           * We do not start up the apps; the test runner is responsible for that if it's necessary,
           * but most CLI commands don't need a started instance of strapi
           * Instead, we just pass in the path of the test apps assigned for this test runner via env
           *  */
          try {
            const env = {
              TEST_APPS: testApps.join(','),
              JWT_SECRET: 'aSecret',
              STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
              FORCE_COLOR: 1,
            };

            const domainDir = path.join(testDomainRoot, domain);
            console.log('Running jest for domain', domain, 'in', domainDir);
            // run the command 'jest --rootDir <domainDir>'
            await execa(
              'jest',
              [
                '--config',
                '../../../../jest.config.cli.js',
                '--rootDir',
                domainDir,
                '--color',
                '--verbose',
                '--runInBand', // tests must not run concurrently
                ...argv._,
              ],
              {
                stdio: 'inherit',
                cwd: domainDir, // run from the domain directory
                env, // pass it our custom env values
                timeout: 2 * 60 * 1000, // 2 minutes
              }
            );
          } catch (err) {
            // If any tests fail
            console.error('Test suite failed for', domain);
            failingTests += 1;
          }

          // make them available again for the next batch
          availableTestApps.push(...testApps);
        })
      );
      if (failingTests > 0) {
        throw new Error(`${failingTests} tests failed`);
      }
    }
  }
}

module.exports = CLIRunner;
