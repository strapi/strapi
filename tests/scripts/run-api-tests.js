'use strict';

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

const runAllTests = async (args) => {
  return execa('yarn', [...jestCmd, ...args], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '../..'),
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      ENV_PATH: process.env.ENV_PATH,
      JWT_SECRET: 'aSecret',
      STRAPI_GRAPHQL_V4_COMPATIBILITY_MODE: 'true',
    },
  });
};

const main = async ({ database, generateApp }, args) => {
  try {
    if (generateApp) {
      await cleanTestApp(appPath);
      await generateTestApp({ appPath, database });
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
