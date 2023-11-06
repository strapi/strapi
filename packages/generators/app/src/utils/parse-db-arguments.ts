import chalk from 'chalk';
import stopProcess from './stop-process';
import type { Scope, DatabaseInfo, NewOptions } from '../types';

interface Options {
  scope: Scope;
  args: Partial<NewOptions>;
}

const DB_ARGS = ['dbclient', 'dbhost', 'dbport', 'dbname', 'dbusername', 'dbpassword'];

const VALID_CLIENTS = ['sqlite', 'mysql', 'postgres'];

export default function parseDatabaseArguments({ scope, args }: Options) {
  const argKeys = Object.keys(args);
  const matchingArgs = DB_ARGS.filter((key) => argKeys.includes(key));
  const missingArgs = DB_ARGS.filter((key) => !argKeys.includes(key));

  if (matchingArgs.length === 0) return;

  if (matchingArgs.length !== DB_ARGS.length && args.dbclient !== 'sqlite') {
    return stopProcess(`Required database arguments are missing: ${missingArgs.join(', ')}.`);
  }

  if (!args.dbclient || !VALID_CLIENTS.includes(args.dbclient)) {
    return stopProcess(
      `Invalid client ${chalk.yellow(args.dbclient)}. Possible choices: ${VALID_CLIENTS.join(
        ', '
      )}.`
    );
  }

  scope.dbforce = args.dbforce !== undefined;

  const database: DatabaseInfo = {
    client: args.dbclient,
    connection: {
      host: args.dbhost,
      port: args.dbport,
      database: args.dbname,
      username: args.dbusername,
      password: args.dbpassword,
      filename: args.dbfile,
    },
  };

  if (args.dbssl !== undefined) {
    database.connection.ssl = args.dbssl === 'true';
  }

  scope.database = database;
}
