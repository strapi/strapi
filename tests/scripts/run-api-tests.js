'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const yargs = require('yargs');

process.env.NODE_ENV = 'test';

const appPath = 'test-apps/api';
process.env.ENV_PATH = path.resolve(__dirname, '../..', appPath, '.env');

const { cleanTestApp, generateTestApp } = require('../helpers/test-app');

const databases = {
  postgres: {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      database: 'strapi_test',
      username: 'strapi',
      password: 'strapi',
      schema: 'myschema',
    },
  },
  mysql: {
    client: 'mysql',
    connection: {
      host: '127.0.0.1',
      port: 3306,
      database: 'strapi_test',
      username: 'strapi',
      password: 'strapi',
    },
  },
  sqlite: {
    client: 'sqlite',
    connection: {
      filename: './tmp/data.db',
    },
    useNullAsDefault: true,
  },
};

const jestCmd = 'jest --config jest.config.api.js --runInBand --forceExit'.split(' ');

const resolvePerfArtifactEnv = ({ perfArtifacts, perfArtifactSuffix }) => {
  const enablePerf =
    perfArtifacts === true ||
    process.env.STRAPI_CI_PERF_ARTIFACTS === '1' ||
    process.env.STRAPI_CI_PERF_ARTIFACTS === 'true';

  if (!enablePerf) {
    return {};
  }

  const repoRoot = path.resolve(__dirname, '../..');
  const rawSuffix = perfArtifactSuffix || process.env.STRAPI_CI_PERF_ARTIFACT_SUFFIX || 'local';
  const safeSuffix = String(rawSuffix).replace(/[^a-zA-Z0-9._-]+/g, '_');
  const perfDir = path.join(repoRoot, 'artifacts', 'api-perf');
  fs.mkdirSync(perfDir, { recursive: true });
  const perfPath = path.join(perfDir, `${safeSuffix}.jsonl`);

  return { STRAPI_CI_PERF_ARTIFACT_PATH: perfPath };
};

const runAllTests = async (args, perfOpts) => {
  // Required for Jest: code run under Jest (including app code loaded by tests) can execute in a context
  // where Node treats dynamic import() as VM-bound; from Node v20.10+ that requires this flag.
  // ESM-only deps (e.g. file-type in upload) use dynamic import(); without the flag we get
  // ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. Other dynamic imports (plop, prettier) run in the
  // main process (CLI/scripts) or browser (admin), so they never hit this.
  const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules']
    .filter(Boolean)
    .join(' ');

  const perfEnv = resolvePerfArtifactEnv(perfOpts);

  return execa('yarn', [...jestCmd, ...args], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..'),
    env: {
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      ENV_PATH: process.env.ENV_PATH,
      JWT_SECRET: 'aSecret',
      STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE: 'true',
      NODE_OPTIONS: nodeOptions,
      ...perfEnv,
    },
  });
};

const main = async ({ database, generateApp, jestArgs, perfArtifacts, perfArtifactSuffix }) => {
  try {
    if (generateApp) {
      await cleanTestApp(appPath);
      await generateTestApp({ appPath, database });
    }

    await runAllTests(jestArgs, { perfArtifacts, perfArtifactSuffix }).catch(() => {
      process.exit(1);
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

yargs
  .parserConfiguration({
    'unknown-options-as-args': true,
  })
  .command(
    '$0',
    'run API integration tests',
    (yarg) => {
      yarg.option('database', {
        alias: 'db',
        describe: 'choose a database',
        choices: Object.keys(databases),
        default: 'sqlite',
      });

      yarg.boolean('generate-app');

      yarg.option('perf-artifacts', {
        type: 'boolean',
        default: false,
        describe:
          'Enable Strapi v1 JSON Lines perf batches (database.performance + request summaries); files go under artifacts/api-perf/',
      });

      yarg.option('perf-artifact-suffix', {
        type: 'string',
        default: '',
        describe:
          'Safe fragment for the output filename (default: local). CI should pass a unique suffix per matrix cell.',
      });
    },
    (argv) => {
      const { database, generateApp = true, perfArtifacts, perfArtifactSuffix } = argv;

      main({
        generateApp,
        database: databases[database],
        jestArgs: argv._,
        perfArtifacts,
        perfArtifactSuffix,
      });
    }
  )
  .help()
  .parse();
