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

const databaseFromArgv = (argv) => {
  if (!argv.dbclient) {
    return databases[argv.databaseName];
  }

  const database = {
    client: argv.dbclient,
    connection: {
      host: argv.dbhost,
      port: argv.dbport,
      database: argv.dbname,
      username: argv.dbusername,
      password: argv.dbpassword,
      filename: argv.dbfile,
    },
  };

  if (argv.dbclient === 'sqlite') {
    database.useNullAsDefault = true;
  }

  return database;
};

// eslint-disable-next-line no-unused-expressions
yargs
  .command(
    '$0 [databaseName]',
    'Generate test app',
    (yarg) => {
      yarg.positional('databaseName', {
        choices: Object.keys(databases),
        default: 'sqlite',
      });

      yarg.boolean('run');

      yarg.option('appPath', {
        type: 'string',
        default: 'test-apps/base',
      });

      yarg.option('template', {
        type: 'string',
        default: undefined,
      });

      yarg.option('dbclient', { type: 'string' });
      yarg.option('dbhost', { type: 'string' });
      yarg.option('dbport', { type: 'number' });
      yarg.option('dbname', { type: 'string' });
      yarg.option('dbusername', { type: 'string' });
      yarg.option('dbpassword', { type: 'string' });
      yarg.option('dbfile', { type: 'string' });
    },
    (argv) => {
      const { run, appPath, template } = argv;

      return main(databaseFromArgv(argv), appPath, { run, template });
    }
  )
  .help().argv;
