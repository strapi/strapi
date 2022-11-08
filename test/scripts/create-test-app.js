'use strict';

process.env.NODE_ENV = 'test';

const yargs = require('yargs');
const { cleanTestApp, generateTestApp } = require('../helpers/test-app-generator');

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

const main = async (database, appPath) => {
  try {
    await cleanTestApp(appPath);
    await generateTestApp({ appPath, database });
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
      });

      yargs.demandOption('database');

      yarg.positional('appPath', {
        type: 'string',
        default: 'test-apps/base',
      });
    },
    (argv) => {
      const { database, appPath = 'test-apps/base' } = argv;
      if (database) {
        return main(databases[database], appPath);
      }

      return main(
        {
          client: argv.dbclient,
          connection: {
            host: argv.dbhost,
            port: argv.dbport,
            database: argv.dbname,
            username: argv.dbusername,
            password: argv.dbpassword,
            filename: argv.dbfile,
          },
        },
        appPath
      );
    }
  )
  .help().argv;
