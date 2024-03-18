import { MARIADB, MYSQL } from './constants';
import type { Database } from '../..';

export interface Information {
  database: typeof MARIADB | typeof MYSQL | null;
  version: string | null;
}

const SQL_QUERIES = {
  VERSION: `SELECT version() as version`,
};

export default class MysqlDatabaseInspector {
  db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  async getInformation(nativeConnection?: unknown): Promise<Information> {
    let database: Information['database'];
    let versionNumber: Information['version'];
    try {
      const [results] = await this.db.connection
        .raw(SQL_QUERIES.VERSION)
        .connection(nativeConnection);
      const versionSplit = results[0].version.split('-');
      const databaseName = versionSplit[1];
      versionNumber = versionSplit[0];
      database = databaseName && databaseName.toLowerCase() === 'mariadb' ? MARIADB : MYSQL;
    } catch (e) {
      return {
        database: null,
        version: null,
      };
    }

    return {
      database,
      version: versionNumber,
    };
  }
}
