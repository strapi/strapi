import type { Question } from 'inquirer';
import semver from 'semver';

import type { Scope, Options, DBClient, DBConfig } from '../types';
import { logger } from './logger';

/**
 * 13.0.3 prebuilds are compiled with Node-API 10, which Node ships from 22.14.0.
 * Earlier 22.x releases segfault when the binary loads. 12.11.1 still loads there.
 */
export const BETTER_SQLITE3_VERSION = '13.0.3';
export const BETTER_SQLITE3_NODE_22_13_VERSION = '12.11.1';
export const BETTER_SQLITE3_13_MIN_NODE = '22.14.0';

export function getBetterSqlite3Version(nodeVersion: string = process.versions.node): string {
  const normalized = semver.coerce(nodeVersion)?.version;

  if (normalized && semver.gte(normalized, BETTER_SQLITE3_13_MIN_NODE)) {
    return BETTER_SQLITE3_VERSION;
  }

  return BETTER_SQLITE3_NODE_22_13_VERSION;
}

/** 12.x runs prebuild-install. 13.x ships the binary and must not be compiled. */
export function betterSqlite3NeedsInstallScript(version: string): boolean {
  return semver.lt(version, '13.0.0');
}

const DBOptions = ['dbclient', 'dbhost', 'dbport', 'dbname', 'dbusername', 'dbpassword'];

const VALID_CLIENTS = ['sqlite', 'mysql', 'postgres'] as const;

const DEFAULT_CONFIG: DBConfig = {
  client: 'sqlite',
  connection: {
    filename: '.tmp/data.db',
  },
};

async function dbPrompt() {
  const { default: inquirer } = await import('inquirer');
  const { useDefault } = await inquirer.prompt<{ useDefault: boolean }>([
    {
      type: 'confirm',
      name: 'useDefault',
      message: 'Do you want to use the default database (sqlite) ?',
      default: true,
    },
  ]);

  if (useDefault) {
    return DEFAULT_CONFIG;
  }

  const { client } = await inquirer.prompt<{ client: DBClient }>([
    {
      type: 'list',
      name: 'client',
      message: 'Choose your default database client',
      choices: ['sqlite', 'postgres', 'mysql'],
      default: 'sqlite',
    },
  ]);

  const questions = dbQuestions[client].map((q) => q({ client }));

  const responses = await inquirer.prompt(questions);

  return {
    client,
    connection: responses,
  };
}

export async function getDatabaseInfos(options: Options): Promise<DBConfig> {
  if (options.skipDb) {
    return DEFAULT_CONFIG;
  }

  if (options.dbclient && !VALID_CLIENTS.includes(options.dbclient)) {
    logger.fatal(
      `Invalid --dbclient: ${options.dbclient}, expected one of ${VALID_CLIENTS.join(', ')}`
    );
  }

  const matchingArgs = DBOptions.filter((key) => key in options);
  const missingArgs = DBOptions.filter((key) => !(key in options));

  if (
    matchingArgs.length > 0 &&
    matchingArgs.length !== DBOptions.length &&
    options.dbclient !== 'sqlite'
  ) {
    logger.fatal(`Required database arguments are missing: ${missingArgs.join(', ')}.`);
  }

  const hasDBOptions = DBOptions.some((key) => key in options);

  if (!hasDBOptions) {
    if (options.quickstart || options.nonInteractive) {
      return DEFAULT_CONFIG;
    }

    return dbPrompt();
  }

  if (!options.dbclient) {
    return logger.fatal('Please specify the database client');
  }

  const database: DBConfig = {
    client: options.dbclient,
    connection: {
      host: options.dbhost,
      port: options.dbport,
      database: options.dbname,
      username: options.dbusername,
      password: options.dbpassword,
      filename:
        options.dbclient === 'sqlite' && options.dbfile === undefined
          ? DEFAULT_CONFIG.connection.filename
          : options.dbfile,
    },
  };

  if (options.dbssl !== undefined) {
    database.connection.ssl = options.dbssl === 'true';
  }

  return database;
}

const sqlClientModule = {
  mysql: { mysql2: '3.20.0' },
  postgres: { pg: '8.20.0' },
};

export function addDatabaseDependencies(scope: Scope) {
  const databaseDependencies =
    scope.database.client === 'sqlite'
      ? { 'better-sqlite3': getBetterSqlite3Version() }
      : sqlClientModule[scope.database.client];

  scope.dependencies = {
    ...scope.dependencies,
    ...databaseDependencies,
  };
}

interface QuestionFactory {
  (options: { client: DBClient }): Question;
}

const DEFAULT_PORTS = {
  postgres: 5432,
  mysql: 3306,
  sqlite: undefined,
};

const database: QuestionFactory = () => ({
  type: 'input',
  name: 'database',
  message: 'Database name:',
  default: 'strapi',
  validate(value: string) {
    if (value.includes('.')) {
      return `The database name can't contain a "."`;
    }

    return true;
  },
});

const host: QuestionFactory = () => ({
  type: 'input',
  name: 'host',
  message: 'Host:',
  default: '127.0.0.1',
});

const port: QuestionFactory = ({ client }) => ({
  type: 'input',
  name: 'port',
  message: 'Port:',
  default: DEFAULT_PORTS[client],
});

const username: QuestionFactory = () => ({
  type: 'input',
  name: 'username',
  message: 'Username:',
});

const password: QuestionFactory = () => ({
  type: 'password',
  name: 'password',
  message: 'Password:',
  mask: '*',
});

const ssl: QuestionFactory = () => ({
  type: 'confirm',
  name: 'ssl',
  message: 'Enable SSL connection:',
  default: false,
});

const filename: QuestionFactory = () => ({
  type: 'input',
  name: 'filename',
  message: 'Filename:',
  default: '.tmp/data.db',
});

const dbQuestions = {
  sqlite: [filename],
  postgres: [database, host, port, username, password, ssl],
  mysql: [database, host, port, username, password, ssl],
};
