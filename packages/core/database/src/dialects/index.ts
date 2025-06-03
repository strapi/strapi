import type { Database } from '..';
import Dialect from './dialect';
import PostgresClass from './postgresql';
import MysqlClass from './mysql';
import SqliteClass from './sqlite';

/**
 * Require our dialect-specific code
 */
const getDialectClass = (client: string): typeof Dialect => {
  switch (client) {
    case 'postgres':
      return PostgresClass;
    case 'mysql':
      return MysqlClass;
    case 'sqlite':
      return SqliteClass;
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

/**
 * Get the dialect of a database client
 */
const getDialectName = (client: unknown) => {
  switch (client) {
    case 'postgres':
      return 'postgres';
    case 'mysql':
      return 'mysql';
    case 'sqlite':
      return 'sqlite';
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

const getDialect = (db: Database) => {
  const { client } = db.config.connection;
  const dialectName = getDialectName(client);

  const constructor = getDialectClass(dialectName);
  const dialect = new constructor(db, dialectName);

  return dialect;
};

export { Dialect, getDialect };
