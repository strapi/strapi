import knex from 'knex';

import { applySearch } from '../search';

const uid = 'api::article.article';

const createMockCtx = (client: string) => {
  const db: any = {
    dialect: { client },
    metadata: {
      get: () => ({
        attributes: {
          title: { type: 'string' },
          views: { type: 'integer' },
        },
      }),
    },
  };

  return {
    qb: { aliasColumn: (column: string) => column },
    uid,
    db,
  } as any;
};

const compileSearch = (query: string, client: string) => {
  const db = knex({ client, useNullAsDefault: true });
  const qb = db('articles');

  applySearch(qb, query, createMockCtx(client));

  const { sql, bindings } = qb.toSQL();
  db.destroy();

  return { sql, bindings };
};

describe('applySearch', () => {
  test.each(['postgres', 'mysql', 'sqlite'])(
    'escapes the _ LIKE wildcard in the search binding (%s)',
    (client) => {
      const { bindings } = compileSearch('a_c', client);

      // every LIKE binding must contain the escaped underscore
      const searchBindings = bindings.filter(
        (binding) => typeof binding === 'string' && binding.includes('a')
      );

      expect(searchBindings.length).toBeGreaterThan(0);
      for (const binding of searchBindings) {
        expect(binding).toBe('%a\\_c%');
      }
    }
  );

  test.each(['postgres', 'mysql', 'sqlite'])(
    'keeps escaping %% and backslashes (%s)',
    (client) => {
      const { bindings } = compileSearch('100%\\', client);

      const searchBindings = bindings.filter(
        (binding) => typeof binding === 'string' && binding.includes('100')
      );

      for (const binding of searchBindings) {
        expect(binding).toBe('%100\\%\\\\%');
      }
    }
  );

  test.each(['postgres', 'mysql', 'sqlite'])(
    'wraps the query in % wildcards (%s)',
    (client) => {
      const { bindings } = compileSearch('hello', client);

      expect(bindings).toContain('%hello%');
    }
  );

  test('searches string and number columns for a numeric query', () => {
    const { sql, bindings } = compileSearch('42', 'postgres');

    expect(sql).toContain('ILIKE');
    expect(bindings).toContain('%42%');
  });
});
