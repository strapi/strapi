'use strict';

process.env.NODE_ENV = 'test';

const yargs = require('yargs');
const { cleanTestApp, generateTestApp, runTestApp } = require('../helpers/test-app');

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
      database: 'strapi-test',
      username: 'root',
      password: 'root',
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

const main = async (database, appPath, opts) => {
  try {
    await cleanTestApp(appPath);
    await generateTestApp({ appPath, database, template: opts.template });

    if (opts.run) {
      await runTestApp(appPath);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// eslint-disable-next-line no-unused-expressions
yargs
  .command(
    '$0 [appName]',
    'Create test app',
    (yarg) => {
      yarg.option('database', {
        alias: 'db',
        describe: 'Database',
        choices: Object.keys(databases),
        default: 'sqlite',
      });

      yarg.boolean('run');

      yarg.positional('appPath', {
        type: 'string',
        default: 'test-apps/base',
      });

      yarg.positional('template', {
        type: 'string',
        default: undefined,
      });
    },
    (argv) => {
      const { database, run, appPath = 'test-apps/base', template } = argv;

      return main(
        argv.dbclient
          ? {
              client: argv.dbclient,
              connection: {
                host: argv.dbhost,
                port: argv.dbport,
                database: argv.dbname,
                username: argv.dbusername,
                password: argv.dbpassword,
                filename: argv.dbfile,
              },
            }
          : databases[database],
        appPath,
        { run, template }
      );
    }
  )
  .help().argv;
