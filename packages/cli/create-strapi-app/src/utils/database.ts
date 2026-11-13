import type { Question } from 'inquirer';
import semver from 'semver';

import type { Scope, Options, DBClient, DBConfig } from '../types';
import { logger } from './logger';

/**
 * 13.0.3 prebuilds are compiled with Node-API 10.
 * Node ships that from 22.14.0 and 23.6.0. 22.0–22.13 and 23.0–23.5 segfault when the binary loads.
 * 12.11.1 still loads there.
 */
export const BETTER_SQLITE3_VERSION = '13.0.3';
export const BETTER_SQLITE3_NODE_22_13_VERSION = '12.11.1';
export const BETTER_SQLITE3_13_MIN_NODE = '22.14.0';
/** First 23.x release that ships Node-API 10. 23.0–23.5 do not. */
export const BETTER_SQLITE3_13_MIN_NODE_23 = '23.6.0';

/**
 * Platforms and CPU architectures that ship inside better-sqlite3@13.0.3.
 * These match `PREBUILD_PLATFORMS` and `PREBUILD_ARCHS` in that version's `lib/binding.js`.
 * Linux glibc and musl both have x64 and arm64 binaries. 32-bit ARM (`linux-arm` and
 * `linuxmusl-arm`) is not among them; 12.11.1 still publishes those two.
 * Every other OS or arch has no 13.x binary, and 13.x does not compile during install.
 */
const BETTER_SQLITE3_13_PREBUILD_PLATFORMS = new Set<string>(['linux', 'darwin', 'win32']);
const BETTER_SQLITE3_13_PREBUILD_ARCHS = new Set<string>(['x64', 'arm64']);

export type BetterSqlite3Host = {
  platform?: NodeJS.Platform;
  arch?: string;
};

/**
 * True when this Node version can load the 13.x prebuild.
 * The running process uses `process.versions.napi`. A passed version uses the releases that shipped Node-API 10.
 */
export function nodeCanLoadBetterSqlite3V13(nodeVersion: string = process.versions.node): boolean {
  if (nodeVersion === process.versions.node) {
    return Number(process.versions.napi) >= 10;
  }

  const normalized = semver.coerce(nodeVersion)?.version;

  if (!normalized || semver.lt(normalized, BETTER_SQLITE3_13_MIN_NODE)) {
    return false;
  }

  if (semver.gte(normalized, '23.0.0') && semver.lt(normalized, BETTER_SQLITE3_13_MIN_NODE_23)) {
    return false;
  }

  return true;
}

/**
 * Yarn 1 compiles better-sqlite3 13 because the package ships binding.gyp and has no install script.
 * 12.11.1 still runs prebuild-install, so Yarn 1 can install it without a C/C++ toolchain.
 * An unknown Yarn version stays on the Node-based pin.
 */
export function yarnCanInstallBetterSqlite3V13(yarnVersion: string | null | undefined): boolean {
  const normalized = yarnVersion ? semver.coerce(yarnVersion)?.version : null;

  if (!normalized) {
    return true;
  }

  return semver.gte(normalized, '2.0.0');
}

/**
 * True when better-sqlite3@13.0.3 contains a prebuild for this OS and CPU.
 * The running process is the default. Tests pass another host to cover machines this one is not.
 */
export function platformCanLoadBetterSqlite3V13(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): boolean {
  return (
    BETTER_SQLITE3_13_PREBUILD_PLATFORMS.has(platform) && BETTER_SQLITE3_13_PREBUILD_ARCHS.has(arch)
  );
}

export function getBetterSqlite3Version(
  nodeVersion: string = process.versions.node,
  yarnVersion?: string | null,
  host: BetterSqlite3Host = {}
): string {
  const platform = host.platform ?? process.platform;
  const arch = host.arch ?? process.arch;

  if (
    !nodeCanLoadBetterSqlite3V13(nodeVersion) ||
    !yarnCanInstallBetterSqlite3V13(yarnVersion) ||
    !platformCanLoadBetterSqlite3V13(platform, arch)
  ) {
    return BETTER_SQLITE3_NODE_22_13_VERSION;
  }

  return BETTER_SQLITE3_VERSION;
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

export function addDatabaseDependencies(
  scope: Scope,
  nodeVersion: string = process.versions.node,
  host: BetterSqlite3Host = {}
) {
  const databaseDependencies =
    scope.database.client === 'sqlite'
      ? {
          'better-sqlite3': getBetterSqlite3Version(
            nodeVersion,
            scope.packageManager === 'yarn' ? scope.yarnVersion : undefined,
            host
          ),
        }
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
