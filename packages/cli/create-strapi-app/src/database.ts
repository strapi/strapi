import inquirer from 'inquirer';

import type { Options, DBClient, DBConfig } from './types';
import dbQuestions from './db-questions';

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
  const hasDBOptions = DBOptions.some((key) => key in options);

  if (!hasDBOptions) {
    if (options.quickstart) {
      return DEFAULT_CONFIG;
    }

    return dbPrompt();
  }

  if (!options.dbclient) {
    console.error('Please specify the database client');
    process.exit(1);
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

export function validateOptions(options: Options) {
  if (options.dbclient && !VALID_CLIENTS.includes(options.dbclient)) {
    console.error(
      `Invalid --dbclient: ${options.dbclient}, expected one of ${VALID_CLIENTS.join(', ')}`
    );
    process.exit(1);
  }

  const matchingArgs = DBOptions.filter((key) => key in options);
  const missingArgs = DBOptions.filter((key) => !(key in options));

  if (
    matchingArgs.length > 0 &&
    matchingArgs.length !== DBOptions.length &&
    options.dbclient !== 'sqlite'
  ) {
    console.error(`Required database arguments are missing: ${missingArgs.join(', ')}.`);
    process.exit(1);
  }
}
