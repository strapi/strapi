'use strict';

const path = require('path');
const execa = require('execa');
const yargs = require('yargs');

process.env.NODE_ENV = 'test';

const appName = 'testApp';
process.env.ENV_PATH = path.resolve(__dirname, '..', appName, '.env');

const { cleanTestApp, generateTestApp } = require('./helpers/test-app-generator');

const databases = {
  postgres: {
    client: 'postgres',
    connection: {
      host: '127.0.0.1',
      port: 5432,
      database: 'strapi_test',
      username: 'strapi',
      password: 'strapi',
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
      charset: 'utf8mb4',
      collation: 'utf8mb4_unicode_ci',
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

const jestCmd =
  'jest --config jest.config.api.js --verbose --runInBand --forceExit --detectOpenHandles'.split(
    ' '
  );

const runAllTests = async (args) => {
  return execa('yarn', [...jestCmd, ...args], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: {
      // if STRAPI_LICENSE is in the env the test will run in ee automatically
      STRAPI_DISABLE_EE: !process.env.STRAPI_LICENSE,
      FORCE_COLOR: 1,
      ENV_PATH: process.env.ENV_PATH,
      JWT_SECRET: 'aSecret',
    },
  });
};

const main = async ({ database, generateApp }, args) => {
  try {
    if (generateApp) {
      await cleanTestApp(appName);
      await generateTestApp({ appName, database });
    }

    await runAllTests(args).catch(() => {
      process.stdout.write('Tests failed\n', () => {
        process.exit(1);
      });
    });

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.stdout.write('Tests failed\n', () => {
      process.exit(1);
    });
  }
};

yargs
  .parserConfiguration({
    'unknown-options-as-args': true,
  })
  .command(
    '$0',
    'run end to end tests',
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
