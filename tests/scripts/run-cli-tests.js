'use strict';

const path = require('path');
const fs = require('node:fs/promises');
const yargs = require('yargs');

const chalk = require('chalk');
const {
  loadDomainConfigs,
  calculateTestAppsRequired,
  runCliTests,
} = require('../utils/runners/cli-runner');
const { publishYalc, setupTestApps, getCurrentTestApps } = require('../utils/runners/shared-setup');

const cwd = path.resolve(__dirname, '../..');
const testAppDirectory = path.join(cwd, 'test-apps', 'cli');
const testRoot = path.join(cwd, 'tests', 'cli');
const testsDir = path.join(testRoot, 'tests');
const templateDir = path.join(cwd, 'tests', 'e2e', 'app-template');

yargs
  .parserConfiguration({
    /**
     * This lets us pass any other arguments to the test runner
     * e.g. the name of a specific test or the project we want to run
     */
    'unknown-options-as-args': false,
  })
  .command({
    command: '*',
    description: 'run the CLI test suite',
    async builder(yarg) {
      // each directory in testDir is a domain
      const domains = await fs.readdir(testsDir);

      yarg.option('concurrency', {
        alias: 'c',
        type: 'number',
        default: domains.length,
        describe: 'Number of concurrent test domains to run',
      });

      yarg.option('domains', {
        alias: 'd',
        describe: 'Run a specific test suite domain',
        type: 'array',
        choices: domains,
        default: domains,
      });

      yarg.option('setup', {
        alias: 'f',
        describe: 'Force the setup process of the test apps',
        type: 'boolean',
        default: false,
      });
    },
    async handler(argv) {
      try {
        const { concurrency, domains, setup } = argv;

        /**
         * Publishing all packages to the yalc store
         */
        console.log('Running yalc...');
        await publishYalc(cwd);
        console.log('Complete');

        // Load domain configs
        const domainConfigs = await loadDomainConfigs(testsDir, domains, argv);

        // Determine the number of test apps required
        const testAppsRequired = calculateTestAppsRequired(domainConfigs, concurrency);

        if (testAppsRequired === 0) {
          throw new Error('No test apps to spawn');
        }

        const testAppPaths = Array.from({ length: testAppsRequired }, (_, i) =>
          path.join(testAppDirectory, `test-app-${i}`)
        );

        const currentTestApps = await getCurrentTestApps(testAppDirectory);

        /**
         * Setup test apps if needed
         */
        const wasSetup = await setupTestApps({
          testAppDirectory,
          testAppPaths,
          templateDir,
          setup,
          currentTestApps,
          setupTestEnvironment: null, // CLI doesn't need browser-specific setup
        });

        if (wasSetup) {
          console.log(
            `${chalk.green('Successfully')} setup test apps for the following domains: ${chalk.bold(
              domains.join(', ')
            )}`
          );
        } else {
          console.log(
            `Skipping setting up test apps, use ${chalk.bold('--setup')} to force the setup process`
          );
        }

        /**
         * Run CLI tests
         */
        await runCliTests({
          cwd,
          testsDir,
          testAppDirectory,
          domains,
          domainConfigs,
          testAppPaths,
          concurrency,
          argv,
        });
      } catch (err) {
        console.error(chalk.red('Error running CLI tests:'));
        /**
         * This is a ExecaError, if we were in TS we could do `instanceof`
         */
        if (err.shortMessage) {
          console.error(err.shortMessage);
          process.exit(1);
        }

        console.error(err);
        process.exit(1);
      }
    },
  })
  .command({
    command: 'clean',
    description: 'clean the test app directory of all test apps',
    async handler() {
      try {
        const { cleanTestApp } = require('../helpers/test-app');
        const currentTestApps = await getCurrentTestApps(testAppDirectory);

        if (currentTestApps.length === 0) {
          console.log('No CLI test apps to clean');
          return;
        }

        await Promise.all(
          currentTestApps.map(async (appPath) => {
            console.log(`Cleaning test app at path: ${chalk.bold(appPath)}`);
            await cleanTestApp(appPath);
          })
        );
      } catch (err) {
        console.error(chalk.red('Error cleaning test apps:'));
        console.error(err);
        process.exit(1);
      }
    },
  })
  .help()
  .parse();
