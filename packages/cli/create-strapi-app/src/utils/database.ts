import inquirer from 'inquirer';
import type { Question } from 'inquirer';

import type { Scope, Options, DBClient, DBConfig } from '../types';
import { logger } from './logger';

const DBOptions = ['dbclient', 'dbhost', 'dbport', 'dbname', 'dbusername', 'dbpassword'];

const VALID_CLIENTS = ['sqlite', 'mysql', 'postgres'] as const;

const DEFAULT_CONFIG: DBConfig = {
  client: 'sqlite',
  connection: {
    filename: '.tmp/data.db',
  },
};

async function dbPrompt() {
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
    if (options.quickstart) {
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
      filename: options.dbfile,
    },
  };

  if (options.dbssl !== undefined) {
    database.connection.ssl = options.dbssl === 'true';
  }

  return database;
}

const sqlClientModule = {
  mysql: { mysql2: '3.9.4' },
  postgres: { pg: '8.8.0' },
  sqlite: { 'better-sqlite3': '9.4.3' },
};

export function addDatabaseDependencies(scope: Scope) {
  scope.dependencies = {
    ...scope.dependencies,
    ...sqlClientModule[scope.database.client],
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
