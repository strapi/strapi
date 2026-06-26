import knex from 'knex';

import createQueryBuilder from '../query-builder';
import type { Database } from '../..';

/**
 * Regression test for issue #26746.
 *
 * When a relation filter forces the query builder to JOIN (and therefore apply
 * `SELECT DISTINCT` to dedupe the joined rows) while the list view is sorted by
 * "status", the status sort compiles to an `ORDER BY CASE ... END` ranking.
 *
 * PostgreSQL rejects `SELECT DISTINCT` combined with an `ORDER BY` expression
 * that is not present in the SELECT list:
 *   "for SELECT DISTINCT, ORDER BY expressions must appear in select list".
 *
 * The query builder must therefore include the status CASE expression in the
 * SELECT list (not only in ORDER BY) whenever DISTINCT is used.
 */

const UID = 'api::article.article';

const buildDb = () => {
  // Real pg knex instance — used purely to render the SQL string (no connection).
  const connection = knex({ client: 'pg' });

  const meta = {
    uid: UID,
    tableName: 'articles',
    attributes: {
      id: { type: 'integer', columnName: 'id' },
      documentId: { type: 'string', columnName: 'document_id' },
      publishedAt: { type: 'datetime', columnName: 'published_at' },
      updatedAt: { type: 'datetime', columnName: 'updated_at' },
    },
  };

  const db = {
    connection,
    getConnection(tableName?: string) {
      return tableName ? connection(tableName) : connection;
    },
    metadata: {
      get(uid: string) {
        if (uid === UID) {
          return meta;
        }
        throw new Error(`Unknown uid ${uid}`);
      },
    },
    dialect: {
      useReturning() {
        return false;
      },
      transformErrors(error: Error) {
        throw error;
      },
    },
  } as unknown as Database;

  return db;
};

describe('Status sort with DISTINCT (issue #26746)', () => {
  it('includes the status CASE expression in the SELECT list when DISTINCT is applied', () => {
    const db = buildDb();

    const qb = createQueryBuilder(UID, db);

    // Simulate a relation filter that forces a JOIN (and therefore DISTINCT).
    qb.join({
      alias: 't1',
      referencedTable: 'authors',
      referencedColumn: 'id',
      rootColumn: 'author_id',
      rootTable: 't0',
    });

    qb.init({ orderBy: 'status', limit: 10, offset: 0 });

    const sql = qb.getKnexQuery().toString().toLowerCase();

    // Sanity: DISTINCT is applied and the status CASE is used to sort.
    expect(sql).toContain('distinct');
    expect(sql).toContain('case when not exists');

    // The CASE expression must appear in the SELECT list (before FROM), otherwise
    // PostgreSQL throws "ORDER BY expressions must appear in select list".
    const selectClause = sql.slice(0, sql.indexOf(' from '));
    expect(selectClause).toContain('case when not exists');
  });
});
