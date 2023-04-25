'use strict';

process.env.NODE_ENV = 'test';

const yargs = require('yargs');
const { cleanTestApp, generateTestApp } = require('./test-app-generator');

const appName = 'testApp';

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

const main = async (database) => {
  try {
    await cleanTestApp(appName);
    await generateTestApp({ appName, database });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

// eslint-disable-next-line no-unused-expressions
yargs
  .command(
    '$0 [databaseName]',
    'Create test app',
    (yarg) => {
      yarg.positional('databaseName', {
        choices: Object.keys(databases),
      });
    },
    (argv) => {
      const { databaseName } = argv;
      if (databaseName) {
        return main(databases[databaseName]);
      }

      return main({
        client: argv.dbclient,
        connection: {
          host: argv.dbhost,
          port: argv.dbport,
          database: argv.dbname,
          username: argv.dbusername,
          password: argv.dbpassword,
          filename: argv.dbfile,
        },
      });
    }
  )
  .help().argv;
