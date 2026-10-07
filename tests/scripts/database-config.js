'use strict';

const yargs = require('yargs/yargs');

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

const resolveDatabaseConfig = (argv) => {
  if (argv.dbclient) {
    const config = {
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
      config.useNullAsDefault = true;
    }

    return config;
  }

  const databaseName = argv.db || argv.databaseName || 'sqlite';
  const preset = databases[databaseName];

  if (!preset) {
    throw new Error(
      `Unknown database "${databaseName}". Expected one of: ${Object.keys(databases).join(', ')}`
    );
  }

  return preset;
};

const createGenerateArgsParser = (args, { exitProcess = false } = {}) => {
  const cli = yargs(args).scriptName('generate-test-app').exitProcess(exitProcess).help();

  cli.command('$0 [databaseName]', 'Generate test app', (yarg) => {
    yarg.positional('databaseName', {
      choices: Object.keys(databases),
      default: 'sqlite',
    });

    yarg.option('db', {
      alias: 'database',
      choices: Object.keys(databases),
      describe: 'Named database preset',
    });

    yarg.option('dbclient', {
      choices: Object.keys(databases),
      describe: 'Database client',
    });

    yarg.option('dbhost', { type: 'string' });
    yarg.option('dbport', { type: 'number' });
    yarg.option('dbname', { type: 'string' });
    yarg.option('dbusername', { type: 'string' });
    yarg.option('dbpassword', { type: 'string' });
    yarg.option('dbfile', { type: 'string' });

    yarg.boolean('run');

    yarg.option('appPath', {
      type: 'string',
      default: 'test-apps/base',
    });

    yarg.option('template', {
      type: 'string',
    });
  });

  return cli;
};

module.exports = {
  createGenerateArgsParser,
  databases,
  resolveDatabaseConfig,
};
