'use strict';

const path = require('path');
const execa = require('execa');
const fs = require('node:fs/promises');
const yargs = require('yargs');

const chalk = require('chalk');
const { cleanTestApp, generateTestApp } = require('../helpers/test-app');

const cwd = path.resolve(__dirname, '../..');
const testAppDirectory = path.join(cwd, 'test-apps', 'cli');
const testRoot = path.join(cwd, 'tests', 'cli');
const testsDir = path.join(testRoot, 'tests');
const templateDir = path.join(testRoot, 'app-template');

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
        await execa('node', [path.join(__dirname, '../..', 'scripts', 'yalc-publish.js')]);
        console.log('Complete');

        const loadDomainConfigs = async (domain) => {
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

        const testAppPaths = Array.from({ length: testAppsRequired }, (_, i) =>
          path.join(testAppDirectory, `test-app-${i}`)
        );

        let currentTestApps = [];

        try {
          currentTestApps = await fs
            .readdir(testAppDirectory)
            .then((paths) => paths.map((appPath) => path.join(testAppDirectory, appPath)));
        } catch (err) {
          // no test apps exist, okay to fail silently
        }

        /**
         * If we don't have enough test apps, we make enough.
         * You can also force this setup if desired, e.g. you
         * update the app-template.
         */
        if (setup || currentTestApps.length < testAppsRequired) {
          /**
           * this will effectively clean the entire directory beforehand
           * as opposed to cleaning the ones we aim to spawn.
           */
          await Promise.all(
            currentTestApps.map(async (appPath) => {
              console.log(`Cleaning test app at path: ${chalk.bold(appPath)}`);
              await cleanTestApp(appPath);
            })
          );

          currentTestApps = [];

          /**
           * Generate the test apps and modify the configuration as needed
           */
          await Promise.all(
            testAppPaths.map(async (appPath) => {
              console.log(`Generating test apps at path: ${chalk.bold(appPath)}`);
              await generateTestApp({
                appPath,
                database: {
                  client: 'sqlite',
                  connection: {
                    filename: './.tmp/data.db',
                  },
                  useNullAsDefault: true,
                },
                template: templateDir,
                link: true,
              });

              /**
               * Because we're running multiple test apps at the same time
               * and the env file is generated by the generator with no way
               * to override it, we manually remove the PORT key/value so when
               * we set it further down for each playwright instance it works.
               */
              const pathToEnv = path.join(appPath, '.env');
              const envFile = (await fs.readFile(pathToEnv)).toString();
              const envWithoutPort = envFile.replace('PORT=1337', '');
              await fs.writeFile(pathToEnv, envWithoutPort);

              currentTestApps.push(appPath);
            })
          );

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
         * Run the tests in parallel based on concurrency value
         * */
        const availableTestApps = [...currentTestApps];

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
                  JWT_SECRET: 'test-jwt-secret',
                };

                const domainDir = path.join(testsDir, domain);
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
        const currentTestApps = await fs.readdir(testAppDirectory);

        if (currentTestApps.length === 0) {
          console.log('No test apps to clean');
          return;
        }

        await Promise.all(
          currentTestApps.map(async (testAppName) => {
            const appPath = path.join(testAppDirectory, testAppName);
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
