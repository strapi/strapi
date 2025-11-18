'use strict';

const path = require('path');
const fs = require('node:fs/promises');
const yargs = require('yargs');

const chalk = require('chalk');
const dotenv = require('dotenv');
const { setupTestEnvironment, runBrowserTests } = require('../utils/runners/browser-runner');
const { publishYalc, setupTestApps, getCurrentTestApps } = require('../utils/runners/shared-setup');

const cwd = path.resolve(__dirname, '../..');
const testAppDirectory = path.join(cwd, 'test-apps', 'e2e');
const testRoot = path.join(cwd, 'tests', 'e2e');
const testDomainRoot = path.join(testRoot, 'tests');
const templateDir = path.join(cwd, 'tests', 'e2e', 'app-template');

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (err) {
    return false;
  }
};

yargs
  .parserConfiguration({
    /**
     * When unknown options is false, using -- to separate playwright args from test:e2e args works
     * When it is true, the script gets confused about additional arguments, with or without using -- to separate commands
     */
    'unknown-options-as-args': false,
  })
  .command({
    command: '*',
    description: 'run the E2E test suite',
    async builder(yarg) {
      const domains = await fs.readdir(testDomainRoot);

      yarg.option('concurrency', {
        alias: 'c',
        type: 'number',
        default: domains.length,
        describe:
          'Number of concurrent test apps to run, a test app runs an entire test suite domain',
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
        if (await pathExists(path.join(testRoot, '.env'))) {
          // Run tests with the env variables specified in the e2e/.env file
          dotenv.config({ path: path.join(testRoot, '.env') });
        }

        const { concurrency, domains, setup } = argv;

        /**
         * Publishing all packages to the yalc store
         */
        await publishYalc(cwd);

        /**
         * We don't need to spawn more apps than we have domains,
         * but equally if someone sets the concurrency to 1
         * then we should only spawn one and run every domain on there.
         */
        const testAppsToSpawn = Math.min(domains.length, concurrency);

        if (testAppsToSpawn === 0) {
          throw new Error('No test apps to spawn');
        }

        const testAppPaths = Array.from({ length: testAppsToSpawn }, (_, i) =>
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
          currentTestApps: currentTestApps.map((appPath) => path.basename(appPath)),
          setupTestEnvironment,
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
         * Run browser tests
         */
        await runBrowserTests({
          cwd,
          testAppPaths,
          testDomainRoot,
          domains,
          testAppsToSpawn,
          argv,
        });
      } catch (err) {
        console.error(chalk.red('Error running e2e tests:'));
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
          console.log('No e2e test apps to clean');
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
