'use strict';

const path = require('path');
const fs = require('node:fs/promises');
const yargs = require('yargs');
const chalk = require('chalk');
const dotenv = require('dotenv');

const {
  publishYalc,
  setupTestApps,
  getCurrentTestApps,
  setupTestEnvironment,
} = require('../utils/runners/shared-setup');
const {
  buildAdmin,
  countRunnableTests,
  runPlaywright,
} = require('../utils/runners/browser-runner');
const { extractShardArgs, planShard } = require('../utils/runners/shard-plan');
const {
  loadDomainConfigs,
  calculateTestAppsRequired,
  buildForwardedRunnerArgs,
  runCLI,
} = require('../utils/runners/cli-runner');
const { createConfig } = require('../../playwright.base.config');

/**
 * Rough share of e2e time per domain, measured on CI (Oct 2026). Only the order matters:
 * starting the heaviest domains first keeps parallel test apps finishing close together.
 * Unknown domains go last.
 */
const DOMAIN_WEIGHTS = {
  'content-manager': 102,
  'content-type-builder': 71,
  admin: 32,
  i18n: 31,
  'media-library': 16,
  settings: 15,
  'content-releases': 13,
  'review-workflows': 12,
  search: 9,
};

const sortDomainsByExpectedDuration = (domains) =>
  [...domains].sort((a, b) => (DOMAIN_WEIGHTS[b] ?? 0) - (DOMAIN_WEIGHTS[a] ?? 0));

/**
 * Measured seconds per `<domain>/<spec file>` for this edition and browser, from
 * tests/e2e/shard-weights.json (rebuilt with tests/scripts/e2e-shard-weights.js). Null when
 * there are no measurements, which falls back to Playwright's own --shard.
 */
const loadShardWeights = ({ edition, project }) => {
  try {
    const all = require('../e2e/shard-weights.json');
    const weights = all[String(edition ?? '').toLowerCase()]?.[project];
    return weights && Object.keys(weights).length > 0 ? weights : null;
  } catch {
    return null;
  }
};

/** Every spec file of the given domains, as paths relative to the domain folder. */
const listSpecFiles = async (testDomainRoot, domains) => {
  const units = [];
  for (const domain of domains) {
    const entries = await fs.readdir(path.join(testDomainRoot, domain), { recursive: true });
    for (const file of entries) {
      if (file.endsWith('.spec.ts')) {
        units.push({ domain, file: file.split(path.sep).join('/') });
      }
    }
  }
  return units;
};

/** Playwright reads file arguments as regular expressions: match this exact file only. */
const toFileFilter = (filePath) => `${filePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`;

const cwd = path.resolve(__dirname, '../..');

/**
 * Test app `j` listens on `E2E_PORT_BASE + j` (default 8000). Set another base to run two e2e
 * runs on one machine, for example from two worktrees.
 */
const E2E_PORT_BASE = Number.parseInt(process.env.E2E_PORT_BASE ?? '8000', 10);

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
    'unknown-options-as-args': false,
  })
  .command({
    command: '*',
    description: 'run the test suite (e2e or cli)',
    builder(yarg) {
      yarg.option('type', {
        alias: 't',
        type: 'string',
        choices: ['e2e', 'cli'],
        demandOption: true,
        describe: 'Type of tests to run (e2e or cli)',
      });

      return yarg;
    },
    async handler(argv) {
      const { type } = argv;

      // Set up paths based on test type
      const testRoot = path.join(cwd, 'tests', type);
      const testAppDirectory = path.join(cwd, 'test-apps', type);
      const testDomainRoot = path.join(testRoot, 'tests');
      const templateDir = path.join(cwd, 'tests', 'app-template');

      try {
        // Load dotenv for e2e tests
        if (type === 'e2e' && (await pathExists(path.join(testRoot, '.env')))) {
          dotenv.config({ path: path.join(testRoot, '.env') });
        }

        if (type === 'e2e') {
          const { applyE2eEditionEnv } = require('../utils/e2e-edition.ts');
          applyE2eEditionEnv();
        }

        // Read domains
        const domains = await fs.readdir(testDomainRoot);

        // Parse test-specific arguments - need to reconstruct the full argv without --type
        // The outer yargs already parsed --type, so we need to get the remaining args
        const processArgs = process.argv.slice(2);
        const typeIndex = processArgs.findIndex((arg) => arg === '--type' || arg === '-t');
        const argsWithoutType =
          typeIndex >= 0
            ? [...processArgs.slice(0, typeIndex), ...processArgs.slice(typeIndex + 2)]
            : processArgs;

        const testYargs = yargs(argsWithoutType)
          .parserConfiguration({
            'unknown-options-as-args': false,
          })
          .option('concurrency', {
            alias: 'c',
            type: 'number',
            default: domains.length,
            describe: `Number of concurrent test ${type === 'cli' ? 'domains' : 'apps'} to run`,
          })
          .option('domains', {
            alias: 'd',
            describe: 'Run a specific test suite domain',
            type: 'array',
            choices: domains,
            default: domains,
          })
          .option('setup', {
            alias: 'f',
            describe: 'Force the setup process of the test apps',
            type: 'boolean',
            default: false,
          })
          .option('updateSnapshot', {
            alias: 'u',
            describe: 'Pass -u to Jest to update snapshots',
            type: 'boolean',
            default: false,
          })
          .parse();

        const { concurrency, domains: selectedDomains, setup, updateSnapshot } = testYargs;

        const forwardedRunnerArgs = buildForwardedRunnerArgs(testYargs);

        /**
         * Publishing all packages to the yalc store
         */
        await publishYalc(cwd);

        // Load domain configs for CLI tests
        let domainConfigs = null;
        let testAppsRequired;
        if (type === 'cli') {
          domainConfigs = await loadDomainConfigs(testDomainRoot, selectedDomains, testYargs);
          testAppsRequired = calculateTestAppsRequired(domainConfigs, concurrency);
        } else {
          // For e2e: we don't need more apps than domains, but respect concurrency
          testAppsRequired = Math.min(selectedDomains.length, concurrency);
        }

        // CLI domains may use testApps: 0 (e.g. create-strapi-app scaffolds to tmp, not TEST_APPS).
        let testAppPaths;
        if (testAppsRequired === 0) {
          if (type !== 'cli') {
            throw new Error('No test apps to spawn');
          }
          testAppPaths = [];
        } else {
          testAppPaths = Array.from({ length: testAppsRequired }, (_, i) =>
            path.join(testAppDirectory, `test-app-${i}`)
          );
        }

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
          setupTestEnvironment: type === 'e2e' ? setupTestEnvironment : null,
          commitE2eBaseline: type === 'e2e',
        });

        if (wasSetup) {
          console.log(
            `${chalk.green('Successfully')} setup test apps for the following domains: ${chalk.bold(
              selectedDomains.join(', ')
            )}`
          );
        } else {
          console.log(
            `Skipping setting up test apps, use ${chalk.bold('--setup')} to force the setup process`
          );
        }

        /**
         * Run the appropriate test runner
         */
        if (type === 'e2e') {
          // Git baseline: single commit during `setupTestApps` when apps are generated (`commitE2eBaseline`).
          // Between tests, `resetFiles` → `git reset --hard` + `git clean -fd` only. No commits here.

          // Every domain starts its app with `--no-build-admin`, so build the panel once here,
          // with the same environment (edition, feature flags) the app will run with.
          await Promise.all(testAppPaths.map((testAppPath) => buildAdmin({ testAppPath })));

          const failedDomains = [];

          const runDomain = async ({ domain, testAppPath, port, testArgs }) => {
            const pathToPlaywrightConfig = path.resolve(testAppPath, 'playwright.config.js');

            console.log(
              `Creating playwright config for domain: ${domain}, at path: ${testAppPath}`
            );

            const config = createConfig({
              testDir: path.join(testDomainRoot, domain),
              port,
              appDir: testAppPath,
              reportFileName: `playwright-${domain}-${port}.xml`,
              domain,
            });

            // Sync `process.env.PORT` when Playwright loads this file (before globalSetup). The
            // canonical port is `E2E_PORT_BASE + j` below, the same as baseURL / webServer;
            // helpers read PORT.
            // `port` is always a safe integer here (never user-controlled). `JSON.stringify(port)`
            // embeds a numeric literal; Node coerces env values to strings on read.
            const configFileTemplate = `
process.env.PORT = ${JSON.stringify(port)};
const config = ${JSON.stringify(config)}

module.exports = config
                `;

            await fs.writeFile(pathToPlaywrightConfig, configFileTemplate);

            // Playwright starts the web server before it applies the shard, so a domain
            // with nothing to run in this shard would still boot Strapi for nothing.
            const runnableTests = await countRunnableTests({
              configPath: pathToPlaywrightConfig,
              cwd,
              port,
              testAppPath,
              testArgs,
            });

            if (runnableTests === 0) {
              console.log(`Skipping ${domain} e2e tests: none to run with these arguments`);
              return;
            }

            console.log(`Running ${domain} e2e tests`);

            try {
              await runPlaywright({
                configPath: pathToPlaywrightConfig,
                cwd,
                port,
                testAppPath,
                testArgs,
              });
            } catch (err) {
              console.error(`${domain} e2e tests failed`);
              failedDomains.push(domain);
            }
          };

          // With measured durations and a --shard, split the spec files by duration across the
          // shards and the test apps of this shard (see tests/utils/runners/shard-plan.js).
          // Otherwise each test app takes the next whole domain as soon as it is free, heaviest
          // first. Either way a failing domain doesn't stop the others: every domain runs and the
          // run fails at the end, like the CLI runner.
          const { shard, project, rest: argsWithoutShard } = extractShardArgs(forwardedRunnerArgs);
          const weights = shard
            ? loadShardWeights({ edition: process.env.STRAPI_E2E_EDITION, project })
            : null;

          if (shard && weights) {
            const lanePlans = planShard({
              weights,
              units: await listSpecFiles(testDomainRoot, selectedDomains),
              shard,
              lanes: testAppPaths.length,
            });

            await Promise.all(
              testAppPaths.map(async (testAppPath, j) => {
                for (const run of lanePlans[j]) {
                  await runDomain({
                    domain: run.domain,
                    testAppPath,
                    port: E2E_PORT_BASE + j,
                    testArgs: [
                      ...argsWithoutShard,
                      ...run.files.map((file) =>
                        toFileFilter(path.join(testDomainRoot, run.domain, file))
                      ),
                    ],
                  });
                }
              })
            );
          } else {
            const pendingDomains = sortDomainsByExpectedDuration(selectedDomains);

            await Promise.all(
              testAppPaths.map(async (testAppPath, j) => {
                while (pendingDomains.length > 0) {
                  await runDomain({
                    domain: pendingDomains.shift(),
                    testAppPath,
                    port: E2E_PORT_BASE + j,
                    testArgs: forwardedRunnerArgs,
                  });
                }
              })
            );
          }

          if (failedDomains.length > 0) {
            throw new Error(`e2e tests failed for: ${failedDomains.join(', ')}`);
          }
        } else {
          // CLI orchestration: batch domains, assign test apps, then run tests
          const availableTestApps = [...testAppPaths];
          const batches = [];

          for (let i = 0; i < selectedDomains.length; i += concurrency) {
            batches.push(selectedDomains.slice(i, i + concurrency));
          }

          // eslint-disable-next-line no-plusplus
          for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            let failingTests = 0;

            await Promise.all(
              batch.map(async (domain) => {
                const config = domainConfigs[domain];
                // Must not call splice(0): that deletes the entire pool. Use splice only when n > 0.
                const neededApps =
                  typeof config.testApps === 'number' && config.testApps >= 0 ? config.testApps : 1;

                if (availableTestApps.length < neededApps) {
                  console.error('Not enough test apps available; aborting');
                  process.exit(1);
                }

                const testApps = neededApps > 0 ? availableTestApps.splice(-neededApps) : [];

                try {
                  const domainDir = path.join(testDomainRoot, domain);
                  const jestConfigPath = path.join(cwd, 'jest.config.cli.js');

                  // Run Jest - this is the only line that differs!
                  await runCLI({
                    domainDir,
                    jestConfigPath,
                    testApps,
                    testArgs: [...(updateSnapshot ? ['-u'] : []), ...forwardedRunnerArgs],
                    domain,
                  });
                } catch (err) {
                  console.error('Test suite failed for', domain);
                  failingTests += 1;
                }

                availableTestApps.push(...testApps);
              })
            );

            if (failingTests > 0) {
              throw new Error(`${failingTests} tests failed`);
            }
          }
        }
      } catch (err) {
        console.error(chalk.red(`Error running ${type} tests:`));
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
    description: 'clean the test app directory',
    builder(yarg) {
      yarg.option('type', {
        alias: 't',
        type: 'string',
        choices: ['e2e', 'cli'],
        demandOption: true,
        describe: 'Type of tests to clean (e2e or cli)',
      });
      return yarg;
    },
    async handler(argv) {
      const { type } = argv;
      const testAppDirectory = path.join(cwd, 'test-apps', type);

      try {
        const { cleanTestApp } = require('../helpers/test-app');
        const currentTestApps = await getCurrentTestApps(testAppDirectory);

        if (currentTestApps.length === 0) {
          console.log(`No ${type} test apps to clean`);
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
