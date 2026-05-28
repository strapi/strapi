'use strict';

const fs = require('fs');
const path = require('path');
const execa = require('execa');
const yargs = require('yargs');

process.env.NODE_ENV = 'test';

const appPath = 'test-apps/api';
process.env.ENV_PATH = path.resolve(__dirname, '../..', appPath, '.env');

const { cleanTestApp, generateTestApp } = require('../helpers/test-app');
const {
  captureGoldenSnapshot,
  goldenSnapshotExists,
  isGoldenRestoreSupported,
} = require('../../packages/utils/api-tests/golden-snapshot');
const { createStrapiInstance } = require('../../packages/utils/api-tests/strapi');

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

const runAllTests = async (args) => {
  // Required for Jest: code run under Jest (including app code loaded by tests) can execute in a context
  // where Node treats dynamic import() as VM-bound; from Node v20.10+ that requires this flag.
  // ESM-only deps (e.g. file-type in upload) use dynamic import(); without the flag we get
  // ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG. Other dynamic imports (plop, prettier) run in the
  // main process (CLI/scripts) or browser (admin), so they never hit this.
  const nodeOptions = [process.env.NODE_OPTIONS, '--experimental-vm-modules']
    .filter(Boolean)
    .join(' ');

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
    },
  });
};

const main = async ({ database, generateApp }, args) => {
  try {
    if (generateApp) {
      await cleanTestApp(appPath);
      await generateTestApp({ appPath, database });
    }

    const envPath = path.resolve(__dirname, '../..', appPath, '.env');
    if (!fs.existsSync(envPath)) {
      throw new Error(
        'API tests require a generated test app at test-apps/api. Run with --generate-app (default) or generate the app first.'
      );
    }

    const appDir = path.resolve(__dirname, '../..', appPath);

    if (!isGoldenRestoreSupported(appDir)) {
      throw new Error(
        'API test golden snapshot requires DATABASE_CLIENT sqlite, postgres, or mysql in the test app .env'
      );
    }

    if (generateApp || !goldenSnapshotExists()) {
      // Migrations run on first boot; capture after bootstrap for every database client.
      process.env.JWT_SECRET = process.env.JWT_SECRET || 'aSecret';
      const strapi = await createStrapiInstance({ logLevel: 'error' });
      const { goldenDir, client } = await captureGoldenSnapshot({ strapi });
      await strapi.destroy();
      console.log(`[api-tests] golden snapshot captured at ${goldenDir} (${client})`);
    }

    await runAllTests(args).catch(() => {
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
    },
    (argv) => {
      const { database, generateApp = true } = argv;

      main({ generateApp, database: databases[database] }, argv._);
    }
  )
  .help()
  .parse();
