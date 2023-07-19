import type { Database } from '..';
import Dialect from './dialect';

/**
 * Require our dialect-specific code
 */
const getDialectClass = (client: string): typeof Dialect => {
  switch (client) {
    case 'postgres':
      return require('./postgresql');
    case 'mysql':
      return require('./mysql');
    case 'sqlite':
      return require('./sqlite');
    default:
      throw new Error(`Unknown dialect ${client}`);
  }
};

/**
 * Get the dialect of a database client
 */
const getDialectName = (client: string) => {
  switch (client) {
    case 'postgres':
      return 'postgres';
    case 'mysql':
    case 'mysql2':
      return 'mysql';
    case 'sqlite':
    case 'sqlite-legacy':
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
