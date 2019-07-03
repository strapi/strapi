'use strict';

const stopProcess = require('./stop-process');

const dbArguments = [
  'dbclient',
  'dbhost',
  'dbport',
  'dbname',
  'dbusername',
  'dbpassword',
];

module.exports = function parseDatabaseArguments({ scope, args }) {
  const argKeys = Object.keys(args);
  const matchingDbArguments = dbArguments.filter(key => argKeys.includes(key));

  if (matchingDbArguments.length === 0) return;

  if (
    matchingDbArguments.length !== dbArguments.length &&
    args.dbclient !== 'sqlite'
  ) {
    return stopProcess(
      `⛔️ Some of the database arguments are missing. Required arguments: ${dbArguments.join(
        ', '
      )}.`
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
