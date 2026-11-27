'use strict';

const path = require('path');
const fs = require('node:fs/promises');
const yargs = require('yargs');
const chalk = require('chalk');
const dotenv = require('dotenv');

const { publishYalc, setupTestApps, getCurrentTestApps } = require('../utils/runners/shared-setup');
const { buildAdmin, piwiRunLabel, runPlaywright } = require('../utils/runners/browser-runner');
const { extractShardArgs, planShard } = require('../utils/runners/shard-plan');
const { selectRunnableDomains } = require('../utils/runners/e2e-domains');
const { createConfig } = require('../../playwright.base.config');

/**
 * The runner parses its flags with yargs before invoking Playwright. Unknown options (e.g.
 * `--grep=…`) become plain properties on the parsed object and are omitted from `_`, so they
 * never reached Playwright unless the user put them after `--`. Re-serialize those properties as
 * argv fragments for Playwright.
 *
 * @param {Record<string, unknown>} testYargs - yargs parse() result for args after `--type`
 * @returns {string[]}
 */
const buildForwardedRunnerArgs = (testYargs) => {
  /** Keys owned by this runner (not for Playwright). */
  const runnerKeys = new Set(['_', '$0', 'concurrency', 'c', 'domains', 'd', 'setup', 'f']);

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

// These domains need setup that the default runs do not have, so they run only when named with `--domains`.
const OPT_IN_DOMAINS = ['enterprise-plugins'];

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
    description: 'run the e2e test suite',
    builder(yarg) {
      yarg.option('type', {
        alias: 't',
        type: 'string',
        choices: ['e2e'],
        demandOption: true,
        describe: 'Type of tests to run',
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
        if (await pathExists(path.join(testRoot, '.env'))) {
          dotenv.config({ path: path.join(testRoot, '.env') });
        }

        const { applyE2eEditionEnv } = require('../utils/e2e-edition.ts');
        applyE2eEditionEnv();

        // Read domains
        const domains = await fs.readdir(testDomainRoot);
        const defaultDomains = domains.filter((domain) => !OPT_IN_DOMAINS.includes(domain));

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
            default: defaultDomains.length,
            describe: 'Number of concurrent test apps to run',
          })
          .option('domains', {
            alias: 'd',
            describe: 'Run a specific test suite domain',
            type: 'array',
            choices: domains,
            default: defaultDomains,
          })
          .option('setup', {
            alias: 'f',
            describe: 'Force the setup process of the test apps',
            type: 'boolean',
            default: false,
          })
          .parse();

        const { concurrency, domains: selectedDomains, setup } = testYargs;

        const forwardedRunnerArgs = buildForwardedRunnerArgs(testYargs);

        // Locally, e2e runs Chromium only unless a --project is passed. CI passes one per job.
        if (!process.env.CI && !extractShardArgs(forwardedRunnerArgs).project) {
          console.log(
            'Running e2e tests on Chromium only. Pass `-- --project=webkit` to run another browser.'
          );
          forwardedRunnerArgs.push('--project=chromium');
        }

        /**
         * Publishing all packages to the yalc store
         */
        await publishYalc(cwd);

        // No more apps than domains, but respect concurrency
        const testAppsRequired = Math.min(selectedDomains.length, concurrency);
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
          currentTestApps: currentTestApps.map((appPath) => path.basename(appPath)),
          commitE2eBaseline: true,
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

        // Git baseline: single commit during `setupTestApps` when apps are generated (`commitE2eBaseline`).
        // Between tests, `resetFiles` → `git reset --hard` + `git clean -fd` only. No commits here.

        // Every domain starts its app with `--no-build-admin`, so build the panel once here,
        // with the same environment (edition, feature flags) the app will run with.
        await Promise.all(testAppPaths.map((testAppPath) => buildAdmin({ testAppPath })));

        const failedDomains = [];

        // A domain whose specs are all gated off for this run would start Strapi only to skip
        // every test (see tests/utils/runners/e2e-domains.js).
        const { runnable: runnableDomains, skipped: skippedDomains } = selectRunnableDomains(
          selectedDomains,
          {
            isCE: process.env.STRAPI_DISABLE_EE === 'true',
            mediaLibrarySuite: process.env.E2E_MEDIA_LIBRARY,
          }
        );
        for (const { domain, reason } of skippedDomains) {
          console.log(`Skipping ${domain} e2e tests: ${reason}`);
        }

        const { shard, project, rest: argsWithoutShard } = extractShardArgs(forwardedRunnerArgs);

        // Without a CI label, the reporter would give every local process the same
        // `hostname|project` id, and parallel domains would cancel each other's run. One base
        // per invocation keeps the shard, domain and lane suffixes working locally too.
        const piwiBaseLabel = process.env.PIWI_RUN_LABEL || `local-${Date.now()}`;

        const runDomain = async ({ domain, testAppPath, port, testArgs, lane }) => {
          const pathToPlaywrightConfig = path.resolve(testAppPath, 'playwright.config.js');

          console.log(`Creating playwright config for domain: ${domain}, at path: ${testAppPath}`);

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

          console.log(`Running ${domain} e2e tests`);

          try {
            await runPlaywright({
              configPath: pathToPlaywrightConfig,
              cwd,
              port,
              testAppPath,
              testArgs,
              runLabel: piwiRunLabel({
                baseLabel: piwiBaseLabel,
                shard,
                domain,
                lane,
              }),
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
        // run fails at the end.
        const weights = shard
          ? loadShardWeights({ edition: process.env.STRAPI_E2E_EDITION, project })
          : null;

        if (shard && weights) {
          const lanePlans = planShard({
            weights,
            units: await listSpecFiles(testDomainRoot, runnableDomains),
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
                  lane: j,
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
          const pendingDomains = sortDomainsByExpectedDuration(runnableDomains);

          await Promise.all(
            testAppPaths.map(async (testAppPath, j) => {
              while (pendingDomains.length > 0) {
                await runDomain({
                  domain: pendingDomains.shift(),
                  testAppPath,
                  port: E2E_PORT_BASE + j,
                  lane: j,
                  testArgs: forwardedRunnerArgs,
                });
              }
            })
          );
        }

        if (failedDomains.length > 0) {
          throw new Error(`e2e tests failed for: ${failedDomains.join(', ')}`);
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
        choices: ['e2e'],
        demandOption: true,
        describe: 'Type of tests to clean',
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
