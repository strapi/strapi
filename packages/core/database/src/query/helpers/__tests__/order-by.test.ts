import createKnex from 'knex';

import { buildStatusSortExpression } from '../order-by';

describe('buildStatusSortExpression', () => {
  const knex = createKnex({ client: 'better-sqlite3', useNullAsDefault: true });
  const db = { connection: knex };

  afterAll(async () => {
    await knex.destroy().catch(() => {});
  });

  const compile = (isI18n: boolean) =>
    buildStatusSortExpression(db, 'articles', 't0', isI18n).toSQL().sql;

  test('does not add a locale condition when isI18n is false', () => {
    expect(compile(false)).not.toContain('locale');
  });

  test('compares locales NULL-safely when isI18n is true', () => {
    const sql = compile(true);
    const condition = '(sub.locale = t0.locale OR (sub.locale IS NULL AND t0.locale IS NULL))';

    // Both the EXISTS and the MAX(updated_at) subqueries must use the NULL-safe comparison
    expect(sql.split(condition)).toHaveLength(3);
    expect(sql).not.toMatch(/AND sub\.locale = t0\.locale\)/);
  });
});
