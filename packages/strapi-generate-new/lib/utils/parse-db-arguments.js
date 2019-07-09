'use strict';

const chalk = require('chalk');
const stopProcess = require('./stop-process');

const DB_ARGS = [
  'dbclient',
  'dbhost',
  'dbport',
  'dbname',
  'dbusername',
  'dbpassword',
];

const VALID_CLIENTS = ['sqlite', 'mysql', 'postgres', 'mongo'];

module.exports = function parseDatabaseArguments({ scope, args }) {
  const argKeys = Object.keys(args);
  const matchingArgs = DB_ARGS.filter(key => argKeys.includes(key));
  const missingArgs = DB_ARGS.filter(key => !argKeys.includes(key));

  if (matchingArgs.length === 0) return;

  if (matchingArgs.length !== DB_ARGS.length && args.dbclient !== 'sqlite') {
    return stopProcess(
      `Required database arguments are missing: ${missingArgs.join(', ')}.`
    );
  }

  if (!VALID_CLIENTS.includes(args.dbclient)) {
    return stopProcess(
      `Invalid client ${chalk.yellow(
        args.dbclient
      )}. Possible choices: ${VALID_CLIENTS.join(', ')}.`
    );
  }

  scope.dbforce = args.dbforce !== undefined;

  const database = {
    settings: {
      client: args.dbclient,
      host: args.dbhost,
      srv: args.dbsrv,
      port: args.dbport,
      database: args.dbname,
      username: args.dbusername,
      password: args.dbpassword,
      filename: args.dbfile,
    },
    options: {},
  };

  if (args.dbauth !== undefined) {
    database.options.authenticationDatabase = args.dbauth;
  }

  if (args.dbssl !== undefined) {
    if (args.dbclient === 'mongo') {
      database.options.ssl = args.dbssl === 'true';
    } else {
      database.settings.ssl = args.dbssl === 'true';
    }
  }

  scope.database = database;
};
