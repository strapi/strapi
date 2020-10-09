'use strict';

const path = require('path');
const execa = require('execa');
const yargs = require('yargs');
const { cleanTestApp, generateTestApp } = require('./helpers/test-app-generator');

const appName = 'testApp';

const databases = {
  mongo: {
    client: 'mongo',
    host: '127.0.0.1',
    port: 27017,
    database: 'strapi_test',
    username: 'root',
    password: 'strapi',
  },
  postgres: {
    client: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    database: 'strapi_test',
    username: 'strapi',
    password: 'strapi',
  },
  mysql: {
    client: 'mysql',
    host: '127.0.0.1',
    port: 3306,
    database: 'strapi_test',
    username: 'strapi',
    password: 'strapi',
  },
  sqlite: {
    client: 'sqlite',
    filename: './tmp/data.db',
  },
};

const test = async args => {
  return execa('yarn', ['-s', 'test:e2e', ...args.split(' ')], {
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..'),
    env: {
      FORCE_COLOR: 1,
    },
  });
};

const main = async (database, args) => {
  try {
    await cleanTestApp(appName);
    await generateTestApp({ appName, database });

    await test(args).catch(() => {
      process.stdout.write('Tests failed\n', () => {
        process.exit(1);
      });
    });

    process.exit(0);
  } catch (error) {
    console.log(error);
    process.stdout.write('Tests failed\n', () => {
      process.exit(1);
    });
  }
};

yargs
  .command(
    '$0',
    'run end to end tests',
    yargs => {
      yargs.option('database', {
        alias: 'db',
        describe: 'choose a database',
        choices: Object.keys(databases),
        default: 'sqlite',
      });
    },
    argv => {
      const { database, _: args } = argv;

      main(databases[database], args.join(' '));
    }
  )
  .help().argv;
