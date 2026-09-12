import knex from 'knex';

import createQueryBuilder from '../query-builder';
import { createQueryScopeProvider } from '../scopes';
import type { Database } from '../..';

/**
 * Query scopes are the enforcement point for row-level access control, so what
 * matters is not that the provider stores a function but that the clause it
 * returns reaches the SQL — on every statement that has a WHERE, and whatever
 * the caller put in their own filters.
 *
 * The SQL is rendered with a connectionless knex, so these assertions are about
 * the statement that would be sent, not about a mock.
 */
const UID = 'api::article.article';

const buildDb = () => {
  const connection = knex({ client: 'pg' });

  const meta = {
    uid: UID,
    tableName: 'articles',
    attributes: {
      id: { type: 'integer', columnName: 'id' },
      title: { type: 'string', columnName: 'title' },
      tenant_id: { type: 'integer', columnName: 'tenant_id' },
    },
  };

  const queryScopes = createQueryScopeProvider();

  const db = {
    connection,
    queryScopes,
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
      useReturning: () => false,
      transformErrors(error: Error) {
        throw error;
      },
    },
  } as unknown as Database;

  return { db, queryScopes };
};

const sqlOf = (qb: ReturnType<typeof createQueryBuilder>) =>
  qb.getKnexQuery().toSQL().sql.toLowerCase();

describe('query scopes', () => {
  describe('the provider', () => {
    it('adds nothing until a scope is registered', () => {
      const { queryScopes } = buildDb();

      expect(queryScopes.isEmpty()).toBe(true);
      expect(queryScopes.resolve({} as never)).toEqual([]);
    });

    it('replaces a scope registered under the same name', () => {
      const { queryScopes } = buildDb();

      queryScopes.register('tenancy', () => ({ a: 1 }));
      queryScopes.register('tenancy', () => ({ b: 2 }));

      expect(queryScopes.resolve({} as never)).toEqual([{ b: 2 }]);
    });

    it('unregisters through the returned function', () => {
      const { queryScopes } = buildDb();

      const remove = queryScopes.register('tenancy', () => ({ a: 1 }));
      remove();

      expect(queryScopes.isEmpty()).toBe(true);
    });

    it('does not unregister a scope that replaced the one being removed', () => {
      const { queryScopes } = buildDb();

      const removeFirst = queryScopes.register('tenancy', () => ({ a: 1 }));
      queryScopes.register('tenancy', () => ({ b: 2 }));
      removeFirst();

      expect(queryScopes.resolve({} as never)).toEqual([{ b: 2 }]);
    });

    it('skips a scope that declines', () => {
      const { queryScopes } = buildDb();

      queryScopes.register('declines', () => null);
      queryScopes.register('applies', () => ({ a: 1 }));

      expect(queryScopes.resolve({} as never)).toEqual([{ a: 1 }]);
    });
  });

  describe('reaching the SQL', () => {
    it('narrows a select', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const sql = sqlOf(createQueryBuilder(UID, db).init({ where: {} }));

      expect(sql).toContain('tenant_id');
      expect(sql).toMatch(/where .*tenant_id.* = \$1|where .*tenant_id/);
    });

    it('narrows a count, so totals cannot leak either', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const qb = createQueryBuilder(UID, db).count().init({ where: {} });

      expect(sqlOf(qb)).toContain('tenant_id');
    });

    it('narrows an update, so a write cannot reach another tenant', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const qb = createQueryBuilder(UID, db).update({ title: 'x' }).where({ id: 1 });

      expect(sqlOf(qb)).toContain('tenant_id');
    });

    it('narrows a delete', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const qb = createQueryBuilder(UID, db).delete().where({ id: 1 });

      expect(sqlOf(qb)).toContain('tenant_id');
    });

    it('leaves an insert alone: there are no existing rows to narrow', () => {
      const { db, queryScopes } = buildDb();
      const scope = jest.fn(() => ({ tenant_id: 7 }));
      queryScopes.register('tenancy', scope);

      createQueryBuilder(UID, db).insert({ title: 'x' }).getKnexQuery();

      expect(scope).not.toHaveBeenCalled();
    });
  });

  describe('a caller cannot widen past a scope', () => {
    it('ANDs the scope with an $or the caller supplied', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const qb = createQueryBuilder(UID, db).init({
        where: { $or: [{ title: 'mine' }, { title: 'theirs' }] },
      });

      const sql = sqlOf(qb);

      // The caller's alternatives stay inside their own group; the tenant
      // predicate sits outside it, so no branch of the `or` escapes the scope.
      expect(sql).toContain('tenant_id');
      expect(sql).toMatch(/\(.*title.*or.*title.*\)/);
    });

    it('applies even when the caller filtered on the scoped column themselves', () => {
      const { db, queryScopes } = buildDb();
      queryScopes.register('tenancy', () => ({ tenant_id: 7 }));

      const qb = createQueryBuilder(UID, db).init({ where: { tenant_id: 99 } });
      const sql = sqlOf(qb);

      expect(sql.match(/tenant_id/g)?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('what the scope is told', () => {
    it('receives the model, so it can decline the ones it knows nothing about', () => {
      const { db, queryScopes } = buildDb();
      const scope = jest.fn(() => null);
      queryScopes.register('tenancy', scope);

      createQueryBuilder(UID, db).init({ where: {} }).getKnexQuery();

      expect(scope).toHaveBeenCalledWith(
        expect.objectContaining({ uid: UID, operation: 'select' })
      );
      expect(scope.mock.calls[0][0].meta.tableName).toBe('articles');
    });

    it('is told which statement it is narrowing', () => {
      const { db, queryScopes } = buildDb();
      const scope = jest.fn(() => null);
      queryScopes.register('tenancy', scope);

      createQueryBuilder(UID, db).delete().where({ id: 1 }).getKnexQuery();

      expect(scope).toHaveBeenCalledWith(expect.objectContaining({ operation: 'delete' }));
    });

    it('runs once per query, not once per clause', () => {
      const { db, queryScopes } = buildDb();
      const scope = jest.fn(() => ({ tenant_id: 7 }));
      queryScopes.register('tenancy', scope);

      const qb = createQueryBuilder(UID, db).init({ where: { title: 'x' } });
      qb.getKnexQuery();
      qb.getKnexQuery();

      expect(scope).toHaveBeenCalledTimes(1);
    });
  });
});
