/**
 * getBatchInsertSize (GH#25198): SQLite uses 500 to stay under compound SELECT limit;
 * other dialects use default 1000.
 */
import Dialect from '../dialect';
import SqliteDialect from '../sqlite';

describe('getBatchInsertSize', () => {
  const db = {} as any;

  it('default dialect returns 1000', () => {
    const dialect = new Dialect(db, 'postgres');
    expect(dialect.getBatchInsertSize()).toBe(1000);
  });

  it('SQLite dialect returns 500', () => {
    const dialect = new SqliteDialect(db);
    expect(dialect.getBatchInsertSize()).toBe(500);
  });
});
