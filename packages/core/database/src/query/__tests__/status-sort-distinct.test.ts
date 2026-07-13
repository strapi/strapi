import knex from 'knex';

import createQueryBuilder from '../query-builder';
import type { Database } from '../..';

/**
 * Regression tests for issue #26746.
 *
 * When a relation filter forces the query builder to JOIN (and therefore apply
 * `SELECT DISTINCT` to dedupe the joined rows) while the list view is sorted by
 * "status", the status sort compiles to an `ORDER BY CASE ... END` ranking.
 *
 * PostgreSQL rejects `SELECT DISTINCT` combined with an `ORDER BY` expression
 * that is not present in the SELECT list:
 *   "for SELECT DISTINCT, ORDER BY expressions must appear in select list".
 */

const UID = 'api::article.article';
const I18N_UID = 'api::article-i18n.article-i18n';

type BuildDbOptions = {
  uid?: string;
  tableName?: string;
  i18n?: boolean;
};

const buildDb = ({ uid = UID, tableName = 'articles', i18n = false }: BuildDbOptions = {}) => {
  // Real pg knex instance — used purely to render the SQL string (no connection).
  const connection = knex({ client: 'pg' });

  const attributes: Record<string, unknown> = {
    id: { type: 'integer', columnName: 'id' },
    documentId: { type: 'string', columnName: 'document_id' },
    publishedAt: { type: 'datetime', columnName: 'published_at' },
    updatedAt: { type: 'datetime', columnName: 'updated_at' },
    title: { type: 'string', columnName: 'title' },
  };

  if (i18n) {
    attributes.locale = { type: 'string', columnName: 'locale' };
  }

  const meta = {
    uid,
    tableName,
    attributes,
  };

  const db = {
    connection,
    getConnection(tableNameArg?: string) {
      return tableNameArg ? connection(tableNameArg) : connection;
    },
    isWriterModel() {
      return false;
    },
    metadata: {
      get(metaUid: string) {
        if (metaUid === uid) {
          return meta;
        }
        throw new Error(`Unknown uid ${metaUid}`);
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

  return { db, uid };
};

const addRelationJoin = (qb: ReturnType<typeof createQueryBuilder>) => {
  qb.join({
    alias: 't1',
    referencedTable: 'authors',
    referencedColumn: 'id',
    rootColumn: 'author_id',
    rootTable: 't0',
  });
};

const getSqlParts = (qb: ReturnType<typeof createQueryBuilder>) => {
  const { sql } = qb.getKnexQuery().toSQL();
  const lower = sql.toLowerCase();
  const orderIdx = lower.indexOf(' order by ');

  return {
    sql: lower,
    beforeOrder: orderIdx >= 0 ? lower.slice(0, orderIdx) : lower,
    orderClause: orderIdx >= 0 ? lower.slice(orderIdx) : '',
  };
};

const extractStatusCase = (clause: string) => {
  const match = clause.match(/case when not exists[\s\S]+? else 2 end/);

  return match?.[0] ?? '';
};

describe('Status sort with DISTINCT (issue #26746)', () => {
  it('includes the status CASE expression in the SELECT list when DISTINCT is applied', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    addRelationJoin(qb);
    qb.init({ orderBy: 'status', limit: 10, offset: 0 });

    const { sql, beforeOrder, orderClause } = getSqlParts(qb);

    expect(sql).toContain('distinct');
    expect(beforeOrder).toContain('case when not exists');
    expect(orderClause).toContain('case when not exists');

    const selectCase = extractStatusCase(beforeOrder);
    const orderCase = extractStatusCase(orderClause);

    expect(selectCase).toBeTruthy();
    expect(selectCase).toEqual(orderCase);
  });

  it('does not add the status CASE to SELECT when DISTINCT is used without status sort', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    addRelationJoin(qb);
    qb.init({ orderBy: { title: 'asc' }, limit: 10, offset: 0 });

    const { sql, beforeOrder, orderClause } = getSqlParts(qb);

    expect(sql).toContain('distinct');
    expect(beforeOrder).not.toContain('case when');
    expect(orderClause).not.toContain('case when');
  });

  it('does not apply DISTINCT for status sort without joins', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    qb.init({ orderBy: { status: 'desc' }, limit: 10, offset: 0 });

    const { sql, beforeOrder, orderClause } = getSqlParts(qb);

    expect(sql).not.toContain('distinct');
    expect(beforeOrder).not.toContain('case when');
    expect(orderClause).toContain('case when');
  });

  it('includes locale in the status CASE subquery for i18n content types', () => {
    const { db, uid } = buildDb({
      uid: I18N_UID,
      tableName: 'articles_i18n',
      i18n: true,
    });
    const qb = createQueryBuilder(uid, db);

    addRelationJoin(qb);
    qb.init({ orderBy: { status: 'asc' }, limit: 10, offset: 0 });

    const { beforeOrder, orderClause } = getSqlParts(qb);

    expect(beforeOrder).toMatch(/sub\.locale\s*=\s*"?t0"?\."?locale"?/);
    expect(orderClause).toMatch(/sub\.locale\s*=\s*"?t0"?\."?locale"?/);
  });

  it('appends id tie-break after status CASE when paginated with DISTINCT', () => {
    const { db, uid } = buildDb();
    const qb = createQueryBuilder(uid, db);

    addRelationJoin(qb);
    qb.init({ orderBy: { status: 'desc' }, limit: 10, offset: 0 });

    const { sql, beforeOrder } = getSqlParts(qb);
    const caseIdx = sql.indexOf('case when');
    const idIdx = sql.indexOf('"t0"."id" asc');

    expect(beforeOrder).toContain('case when');
    expect(caseIdx).toBeGreaterThan(-1);
    expect(idIdx).toBeGreaterThan(-1);
    expect(caseIdx).toBeLessThan(idIdx);
  });
});
