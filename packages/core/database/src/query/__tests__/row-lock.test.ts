import knex from 'knex';

import createQueryBuilder from '../query-builder';
import type { Database } from '../..';

const UID = 'api::article.article';

const KNEX_CLIENT = {
  postgres: 'pg',
  mysql: 'mysql2',
  sqlite: 'better-sqlite3',
} as const;

const buildDb = (client: 'postgres' | 'mysql' | 'sqlite') => {
  const connection = knex({ client: KNEX_CLIENT[client], useNullAsDefault: true });

  const meta = {
    uid: UID,
    tableName: 'articles',
    attributes: {
      id: { type: 'integer', columnName: 'id' },
      documentId: { type: 'string', columnName: 'document_id' },
    },
  };

  const db = {
    connection,
    getConnection(tableName?: string) {
      return tableName ? connection(tableName) : connection;
    },
    metadata: {
      get(metaUid: string) {
        if (metaUid === UID) {
          return meta;
        }
        throw new Error(`Unknown uid ${metaUid}`);
      },
    },
    dialect: {
      client,
      useReturning() {
        return false;
      },
      transformErrors(error: Error) {
        throw error;
      },
    },
  } as unknown as Database;

  return { db, connection };
};

const lockSql = (
  client: 'postgres' | 'mysql' | 'sqlite',
  method: 'forUpdate' | 'forNoKeyUpdate'
) => {
  const { db, connection } = buildDb(client);
  const qb = createQueryBuilder(UID, db);

  qb.select(['id']).where({ documentId: 'doc_1' });
  qb[method]();

  const { sql } = qb.getKnexQuery().toSQL();
  connection.destroy();
  return sql.toLowerCase();
};

describe('row locks', () => {
  it('uses FOR NO KEY UPDATE on Postgres', () => {
    const sql = lockSql('postgres', 'forNoKeyUpdate');

    expect(sql).toContain('for no key update');
    expect(sql).not.toContain('for update');
  });

  it('falls back to FOR UPDATE on MySQL', () => {
    const sql = lockSql('mysql', 'forNoKeyUpdate');

    expect(sql).toContain('for update');
    expect(sql).not.toContain('for no key update');
  });

  it('emits no row lock on SQLite', () => {
    const sql = lockSql('sqlite', 'forNoKeyUpdate');

    expect(sql).not.toContain('for update');
    expect(sql).not.toContain('for no key update');
  });

  it('keeps FOR UPDATE when that lock was requested', () => {
    const sql = lockSql('postgres', 'forUpdate');

    expect(sql).toContain('for update');
    expect(sql).not.toContain('for no key update');
  });
});
