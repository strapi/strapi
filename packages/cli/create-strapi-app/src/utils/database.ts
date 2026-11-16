import type { Question } from 'inquirer';

import type { Scope, Options, DBClient, DBConfig } from '../types';
import { logger } from './logger';

// Any of these flags selects the flag-driven path, and all of them are required unless the client
// is sqlite. `--dbfile` and `--dbssl` are not in the list: `--dbfile` alone implies sqlite (see
// `getDatabaseInfos`), and `--dbssl` alone is ignored, as it always was.
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

// An empty or whitespace-only `--dbfile` would be written as an empty `DATABASE_FILENAME`
const isBlank = (value: string | undefined) => value === undefined || value.trim() === '';

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

  const hasDBOptions = matchingArgs.length > 0;
  // sqlite is the only client that reads `--dbfile`, so a lone `--dbfile` selects it instead of
  // being dropped or failing a script that never passed `--dbclient`
  const hasLoneDBFile = hasDBOptions === false && 'dbfile' in options;

  if (hasDBOptions === false && hasLoneDBFile === false) {
    if (options.quickstart || options.nonInteractive) {
      return DEFAULT_CONFIG;
    }

    return dbPrompt();
  }

  const client = hasLoneDBFile === true ? 'sqlite' : options.dbclient;

  if (client === undefined) {
    return logger.fatal('Please specify the database client');
  }

  const database: DBConfig = {
    client,
    connection: {
      host: options.dbhost,
      port: options.dbport,
      database: options.dbname,
      username: options.dbusername,
      password: options.dbpassword,
      filename:
        client === 'sqlite' && isBlank(options.dbfile) === true
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
  sqlite: { 'better-sqlite3': '12.11.1' },
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
